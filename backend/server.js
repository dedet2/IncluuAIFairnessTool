const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const csv = require('csv-parse');
const path = require('path');

const app = express();

// Define allowedOrigins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://aifairnesstoolfrontend-production.up.railway.app',
  'http://localhost:3000'
].filter(Boolean);

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

// Mock user data (replace with your own database)
const users = [];

// JWT secret key from environment variable
const secretKey = process.env.JWT_SECRET_KEY || 'local_development_secret';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET_KEY) {
  console.error('JWT_SECRET_KEY is not set in production environment variables');
  process.exit(1);
} else if (!process.env.JWT_SECRET_KEY) {
  console.warn('Warning: JWT_SECRET_KEY is not set. Using insecure default for local development. Do not use this in production!');
}
// Path to Python executable
const pythonPath = 'python3';

// Check if Python scripts exist
if (!fs.existsSync(path.join(__dirname, 'aif360_preprocessing.py')) || !fs.existsSync(path.join(__dirname, 'bias_detection.py'))) {
  console.error('Python scripts not found');
  process.exit(1);
}

// User registration endpoint
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { email, password: hashedPassword };
    users.push(newUser);
    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = users.find((user) => user.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.email }, secretKey, { expiresIn: '1h' });
    res.json({ token, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const protectedAttributes = JSON.parse(req.body.protectedAttributes || '[]');
  const protectedAttributesSet = new Set([
    ...protectedAttributes,
    ...protectedAttributes.map(attr => attr.replace(' ', ''))
  ]);
  const filePath = req.file.path;

  fs.readFile(filePath, 'utf8', (err, fileData) => {
    if (err) {
      return res.status(500).json({ message: 'Error reading file' });
    }

    csv.parse(fileData, { columns: true }, (err, parsedData) => {
      if (err) {
        return res.status(500).json({ message: 'Error parsing CSV' });
      }

      const targetColumn = req.body.targetColumn;
      const protectedAttributes = JSON.parse(req.body.protectedAttributes || '[]');
      if (protectedAttributes.includes('SexualOrientation')) {
        protectedAttributes[protectedAttributes.indexOf('SexualOrientation')] = 'Sexual Orientation';
      }
      const datasetType = req.body.datasetType;
      const referenceReligion = req.body.referenceReligion;
      const referenceSexualOrientation = req.body.referenceSexualOrientation;

      console.log("Target Column:", targetColumn);
      console.log("Protected Attributes:", protectedAttributes);
      console.log("Dataset Type:", datasetType);
      console.log("Reference Religion:", referenceReligion);
      console.log("Reference Sexual Orientation:", referenceSexualOrientation);

      const preprocessingProcess = spawn(pythonPath, [
        path.join(__dirname, 'aif360_preprocessing.py'),
        JSON.stringify(parsedData),
        targetColumn,
        JSON.stringify(protectedAttributes),
        datasetType,
        referenceReligion,
        referenceSexualOrientation
      ]);

      let preprocessingResult = '';

      preprocessingProcess.stdout.on('data', (data) => {
        preprocessingResult += data.toString();
      });

      preprocessingProcess.stderr.on('data', (data) => {
        console.log(`Preprocessing log: ${data}`);
      });

      preprocessingProcess.on('close', (code) => {
        if (code !== 0) {
          return res.status(500).json({ message: 'Error preprocessing data' });
        }

        try {
          const preprocessingData = JSON.parse(preprocessingResult);

          if (preprocessingData.error) {
            console.error('Preprocessing error:', preprocessingData.error);
            return res.status(500).json({ message: 'Error preprocessing data', error: preprocessingData.error });
          }

          const originalData = preprocessingData.original_data;
          const reweighedData = preprocessingData.reweighed_data || null;
          const rawData = preprocessingData.raw_data;
          const labelNames = [targetColumn];

          console.log("Original Data Sample:", originalData.slice(0, 5));
          if (reweighedData) {
            console.log("Reweighed Data Sample:", reweighedData.slice(0, 5));
          }
          console.log("Raw Data:", rawData);

          const biasDetectionProcessArgs = [
            JSON.stringify(originalData),
            JSON.stringify(reweighedData),
            JSON.stringify(labelNames),
            JSON.stringify(protectedAttributes),
            datasetType === 'training' ? 'true' : 'false',
            referenceReligion,
            referenceSexualOrientation 
          ];

          const biasDetectionProcess = spawn(pythonPath, [
            path.join(__dirname, 'bias_detection.py'),
            ...biasDetectionProcessArgs
          ]);

          let biasDetectionResult = '';
          let biasDetectionError = '';

          biasDetectionProcess.stdout.on('data', (data) => {
            biasDetectionResult += data.toString();
          });

          biasDetectionProcess.stderr.on('data', (data) => {
            biasDetectionError += data.toString();
            console.error(`Error from bias detection script: ${data}`);
          });

          biasDetectionProcess.on('close', (code) => {
            if (code !== 0) {
              console.error(`Bias detection process exited with code ${code}`);
              console.error(`Bias detection error output: ${biasDetectionError}`);
              return res.status(500).json({ message: 'Error detecting bias', error: biasDetectionError });
            }
          
            try {
              const trimmedResult = biasDetectionResult.trim();
              const biasMetrics = JSON.parse(trimmedResult);
          
              // Convert "NaN" strings to null for better JSON compatibility
              for (let key in biasMetrics.original) {
                if (biasMetrics.original[key] === "NaN") {
                  biasMetrics.original[key] = null;
                }
              }
              if (biasMetrics.reweighed) {
                for (let key in biasMetrics.reweighed) {
                  if (biasMetrics.reweighed[key] === "NaN") {
                    biasMetrics.reweighed[key] = null;
                  }
                }
              }
          
              // Include outcome rates and raw_data from preprocessing data
              biasMetrics.original.outcome_rates = preprocessingData.outcome_rates;
              biasMetrics.original.raw_data = rawData;
              if (biasMetrics.reweighed) {
                biasMetrics.reweighed.outcome_rates = preprocessingData.outcome_rates;
                biasMetrics.reweighed.raw_data = rawData;
              }
          
              console.log('Bias Metrics:', JSON.stringify(biasMetrics, null, 2));
          
              res.status(200).json({
                message: 'File uploaded and processed successfully',
                biasMetrics,
                datasetType
              });
            } catch (error) {
              console.error('JSON parse error:', error);
              console.error('Raw biasDetectionResult:', biasDetectionResult);
              res.status(500).json({
                message: 'Error processing bias detection results',
                error: error.toString(),
                rawResult: biasDetectionResult
              });
            }
          });
        } catch (error) {
          console.error('JSON parse error:', error);
          console.error('Raw preprocessingResult:', preprocessingResult);
          res.status(500).json({
            message: 'Error processing preprocessing results',
            error: error.toString(),
            rawResult: preprocessingResult
          });
        }
      });
    });
  });
});


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);
  
  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', userId: req.user.userId });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`${new Date().toISOString()} - Error:`, err);
  res.status(500).json({ 
    message: 'Internal server error', 
    error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message 
  });
});

// Start the server
const port = process.env.PORT || 5003;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});