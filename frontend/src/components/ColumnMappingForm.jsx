import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Form, Input, Button, Select, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Option } = Select;

const ColumnMappingForm = () => {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [form] = Form.useForm();

  const predefinedCategories = [
    'Gender',
    'Race',
    'Age',
    'Education',
    'Disability',
    'Religion',
    'Outcome'
  ];

  const handleFileChange = (info) => {
    const { status } = info.file;
    if (status === 'done') {
      setFile(info.file.originFileObj);
      message.success(`${info.file.name} file uploaded successfully.`);
      
      Papa.parse(info.file.originFileObj, {
        header: true,
        preview: 1,
        complete: (results) => {
          const columnNames = results.meta.fields;
          setColumns(columnNames);
        },
      });
    } else if (status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  };

  const handleSubmit = async (values) => {
    if (!file) {
      message.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const columnMappings = {};
    predefinedCategories.forEach(category => {
      if (values[category]) {
        columnMappings[category] = values[category];
      }
    });

    console.log('Submitting with column mappings:', columnMappings);
    
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: {
          columnMappings: JSON.stringify(columnMappings),
          referenceReligion: values.referenceReligion,
          datasetType: values.datasetType,
        },
      });

      console.log('Response:', response.data);
      message.success('File uploaded and processed successfully');
      form.resetFields();
      setFile(null);
      setColumns([]);
    } catch (error) {
      console.error('File upload error:', error);
      message.error('File upload failed');
    }
  };

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item
        name="file"
        label="Select File"
        rules={[{ required: true, message: 'Please select a file' }]}
      >
        <Upload
          accept=".csv"
          beforeUpload={() => false}
          onChange={handleFileChange}
        >
          <Button icon={<UploadOutlined />}>Select File</Button>
        </Upload>
      </Form.Item>

      {columns.length > 0 && (
        <>
          {predefinedCategories.map(category => (
            <Form.Item
              key={category}
              name={category}
              label={`${category} Column`}
              rules={[{ required: category === 'Outcome', message: `Please select the ${category} column` }]}
            >
              <Select placeholder={`Select ${category} Column`}>
                <Option value="">None</Option>
                {columns.map((column) => (
                  <Option key={column} value={column}>
                    {column}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          ))}

          <Form.Item
            name="referenceReligion"
            label="Reference Religion"
            rules={[{ required: true, message: 'Please select a reference religion' }]}
          >
            <Input placeholder="Enter reference religion" />
          </Form.Item>

          <Form.Item
            name="datasetType"
            label="Dataset Type"
            rules={[{ required: true, message: 'Please select the dataset type' }]}
          >
            <Select placeholder="Select Dataset Type">
              <Option value="training">Training Data</Option>
              <Option value="modelOutcome">Model Outcome Data</Option>
            </Select>
          </Form.Item>
        </>
      )}

      <Form.Item>
        <Button type="primary" htmlType="submit" disabled={!file}>
          Upload and Process
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ColumnMappingForm;