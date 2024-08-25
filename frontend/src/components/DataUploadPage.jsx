import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Upload, Checkbox, Radio, Select, Typography, message, Tooltip } from 'antd';
import { UploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const DataUploadPage = () => {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [targetColumn, setTargetColumnState] = useState('');
  const [protectedAttributes, setProtectedAttributes] = useState([]);
  const [datasetType, setDatasetType] = useState('modelOutcome');
  const [religionCategories, setReligionCategories] = useState([]);
  const [referenceReligion, setReferenceReligion] = useState('');
  const [referenceSexualOrientation, setReferenceSexualOrientation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const setTargetColumn = (value) => {
    setTargetColumnState(value);
    form.setFieldsValue({ targetColumn: value });
    setProtectedAttributes(prevAttributes => prevAttributes.filter(attr => attr !== value));
  };

  const referenceGroupExplanation = (
    <Paragraph>
      The reference group is the group against which other groups will be compared when measuring bias. 
      It's often the majority group or the group historically considered privileged. For example, in gender 
      bias analysis, "Male" might be the reference group. Selecting a reference group doesn't imply this 
      group should be privileged, it's simply a statistical baseline for comparisons.
    </Paragraph>
  );

  const handleFileChange = (info) => {
    const uploadedFile = info.file.originFileObj || info.file;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target.result;
      Papa.parse(csvData, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.data.length > 0) {
            const availableColumns = Object.keys(results.data[0]);
            setColumns(availableColumns);
            if (availableColumns.includes('Outcome')) {
              setTargetColumn('Outcome');
              form.setFieldsValue({ targetColumn: 'Outcome' });
            }
            const defaultProtectedAttrs = ['Gender', 'Race', 'Age', 'Disability', 'Religion', 'SexualOrientation'].filter(attr => 
              availableColumns.includes(attr)
            );
            setProtectedAttributes(defaultProtectedAttrs);
            form.setFieldsValue({ protectedAttributes: defaultProtectedAttrs });

            const religionCol = availableColumns.find(col => col.toLowerCase() === 'religion');
            if (religionCol) {
              const uniqueReligions = [...new Set(results.data.map(row => row[religionCol]))].filter(Boolean);
              setReligionCategories(uniqueReligions);
            }
          }
        },
        error: (error) => {
          console.error('Error parsing CSV file:', error);
          setErrorMessage('Error parsing CSV file');
        },
      });
    };
    reader.readAsText(uploadedFile);
  };

  const handleProtectedAttributesChange = (checkedValues) => {
    setProtectedAttributes(checkedValues);
    if (!checkedValues.includes('Religion')) {
      setReferenceReligion('');
    }
    if (!checkedValues.includes('SexualOrientation')) {
      setReferenceSexualOrientation('');
    }
  };

  const handleSubmit = async (values) => {
    setIsLoading(true);
    setErrorMessage('');
  
    const { targetColumn, protectedAttributes } = values;
  
    if (!columns.includes(targetColumn)) {
      setErrorMessage(`Target column "${targetColumn}" not found in the dataset`);
      setIsLoading(false);
      return;
    }
  
    for (const attr of protectedAttributes) {
      if (!columns.includes(attr)) {
        setErrorMessage(`Protected attribute "${attr}" not found in the dataset`);
        setIsLoading(false);
        return;
      }
    }
  
    const expandedProtectedAttributes = protectedAttributes.flatMap(attr => [attr, attr.replace(' ', '')]);
    const uniqueProtectedAttributes = [...new Set(expandedProtectedAttributes)];
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetColumn', targetColumn);
    formData.append('protectedAttributes', JSON.stringify(uniqueProtectedAttributes));
    formData.append('datasetType', datasetType);
    formData.append('referenceReligion', referenceReligion);
    formData.append('referenceSexualOrientation', referenceSexualOrientation);
  
    try {
      const response = await axios.post('http://localhost:5003/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const biasMetrics = response.data.biasMetrics;
      console.log('Bias metrics received:', biasMetrics); // Add this log
      setErrorMessage('');
      navigate('/results', { state: { biasMetrics, datasetType, referenceReligion, referenceSexualOrientation } });
    } catch (error) {
      console.error('File upload error:', error);
      setErrorMessage('File upload failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <Title>Data Upload</Title>
      <Form form={form} onFinish={handleSubmit} className="upload-form">
        <Form.Item name="file" label="Select a file" rules={[{ required: true, message: 'Please select a file' }]}>
          <Upload accept=".csv" beforeUpload={() => false} onChange={handleFileChange} filelist={file ? [file] : []}>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>
        <Form.Item 
          name="datasetType"
          label="Dataset Type"
          rules={[{ required: true, message: 'Please select the type of dataset' }]}
        >
          <Radio.Group onChange={(e) => setDatasetType(e.target.value)} value={datasetType}>
            <Radio value="training">Training Data</Radio>
            <Radio value="modelOutcome">Model Outcome Data</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item 
          name="targetColumn"
          label="Target Variable"
          rules={[{ required: true, message: 'Please select a target variable' }]}
        >
          <Input placeholder="Enter the target column name" />
        </Form.Item>
        <Form.Item 
          name="protectedAttributes"
          label="Protected Attributes"
          rules={[{ required: true, message: 'Please select at least one protected attribute' }]}
        >
          <Checkbox.Group 
            options={columns.filter(column => column !== targetColumn).map(column => ({ label: column, value: column }))}
            onChange={handleProtectedAttributesChange}
          />
        </Form.Item>
        {protectedAttributes.includes('Religion') && (
          <Form.Item
            name="referenceReligion"
            label={
              <span>
                Reference Religion Group&nbsp;
                <Tooltip title={referenceGroupExplanation} overlayClassName="custom-tooltip">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            rules={[{ required: true, message: 'Please select a reference religion group' }]}
          >
            <Select
              placeholder="Select a reference religion"
              onChange={(value) => setReferenceReligion(value)}
            >
              {religionCategories.map(religion => (
                <Option key={religion} value={religion}>{religion}</Option>
              ))}
            </Select>
          </Form.Item>
        )}
        {protectedAttributes.includes('SexualOrientation') && (
          <Form.Item
            name="referenceSexualOrientation"
            label={
              <span>
                Reference Sexual Orientation Group&nbsp;
                <Tooltip title="Select the sexual orientation to be used as the reference (privileged) group for bias analysis." overlayClassName="custom-tooltip">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </span>
            }
            rules={[{ required: true, message: 'Please select a reference sexual orientation group' }]}
          >
            <Select
              placeholder="Select a reference sexual orientation"
              onChange={(value) => setReferenceSexualOrientation(value)}
            >
              <Option value="Heterosexual">Heterosexual</Option>
              <Option value="Lesbian">Lesbian</Option>
              <Option value="Gay">Gay</Option>
              <Option value="Bisexual">Bisexual</Option>
              <Option value="Asexual">Asexual</Option>
              <Option value="Queer">Queer</Option>
              <Option value="Pansexual">Pansexual</Option>
            </Select>
          </Form.Item>
        )}
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            disabled={!file || isLoading}
            loading={isLoading}
          >
            Upload and Analyze
          </Button>
        </Form.Item>
      </Form>
      {errorMessage && <Text type="danger">{errorMessage}</Text>}
    </div>
  );
};

export default DataUploadPage;