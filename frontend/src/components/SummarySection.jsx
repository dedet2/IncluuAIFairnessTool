import React from 'react';
import { Card, Typography, Table, Tooltip, Tag } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const SummarySection = ({ biasMetrics }) => {
  const getSummaryItems = (metrics) => {
    if (!metrics || typeof metrics !== 'object') {
      return [];
    }

    return Object.entries(metrics)
    .filter(([attr]) => attr !== 'outcome_rates' && attr !== 'raw_data') // Filter out outcome_rates and raw_data
    .map(([attr, data]) => {
      if (attr === 'Race' || attr === 'Education') {
        return {
          attribute: attr,
          spd: data.overall?.statistical_parity_difference,
          di: data.overall?.disparate_impact,
        };
      } else if (data.statistical_parity_difference !== undefined && data.disparate_impact !== undefined) {
        return {
          attribute: attr,
          spd: data.statistical_parity_difference,
          di: data.disparate_impact,
        };
      } else {
        return null; // or some default value
      }
    }).filter(item => item !== null); // Remove any null items
  };

  const getColorForValue = (value, metric) => {
    if (value === null || value === undefined) return 'default';
    value = parseFloat(value);
    if (metric === 'spd') {
      if (Math.abs(value) < 0.1) return 'success';
      if (Math.abs(value) < 0.2) return 'warning';
      return 'error';
    } else if (metric === 'di') {
      if (value >= 0.8 && value <= 1.25) return 'success';
      if (value >= 0.6 && value < 0.8) return 'warning';
      return 'error';
    }
    return 'default';
  };

  const getExplanationForSPD = (value, attribute) => {
    if (value === null || value === undefined) return "No data available.";
    value = parseFloat(value);
    const absValue = Math.abs(value);
    const percentage = (absValue * 100).toFixed(1);
    
    let privilegedGroup, unprivilegedGroup;
    switch(attribute) {
      case 'Gender':
        privilegedGroup = 'Males';
        unprivilegedGroup = 'Females';
        break;
      case 'Age':
        privilegedGroup = 'Young (< 40)';
        unprivilegedGroup = 'Old (≥ 40)';
        break;
      case 'Race':
        privilegedGroup = 'White';
        unprivilegedGroup = 'Other racial groups';
        break;
      case 'Education':
        privilegedGroup = 'PhD';
        unprivilegedGroup = 'Other education levels';
        break;
      case 'Disability':
        privilegedGroup = 'No Disability';
        unprivilegedGroup = 'With Disability';
        break;
      default:
        privilegedGroup = 'Privileged Group';
        unprivilegedGroup = 'Unprivileged Group';
    }

    if (absValue < 0.1) {
      return `The difference in positive outcome rates between ${privilegedGroup} and ${unprivilegedGroup} is small (${percentage}%), suggesting relatively fair treatment.`;
    } else if (value < 0) {
      return `${unprivilegedGroup} have a ${percentage}% lower rate of positive outcomes compared to ${privilegedGroup}. This difference suggests potential bias against ${unprivilegedGroup}.`;
    } else {
      return `${unprivilegedGroup} have a ${percentage}% higher rate of positive outcomes compared to ${privilegedGroup}. This difference suggests potential bias in favor of ${unprivilegedGroup}.`;
    }
  };

  const getExplanationForDI = (value, attribute) => {
    if (value === null || value === undefined) return "No data available.";
    value = parseFloat(value);
    const percentage = (value * 100).toFixed(0);
    
    let privilegedGroup, unprivilegedGroup;
    switch(attribute) {
      case 'Gender':
        privilegedGroup = 'Males';
        unprivilegedGroup = 'Females';
        break;
      case 'Age':
        privilegedGroup = 'Young (< 40)';
        unprivilegedGroup = 'Old (≥ 40)';
        break;
      case 'Race':
        privilegedGroup = 'White';
        unprivilegedGroup = 'Other racial groups';
        break;
      case 'Education':
        privilegedGroup = 'PhD';
        unprivilegedGroup = 'Other education levels';
        break;
      case 'Disability':
        privilegedGroup = 'No Disability';
        unprivilegedGroup = 'With Disability';
        break;
      default:
        privilegedGroup = 'Privileged Group';
        unprivilegedGroup = 'Unprivileged Group';
    }

    if (value >= 0.8 && value <= 1.25) {
      return `The rate of positive outcomes for ${unprivilegedGroup} is ${percentage}% of the rate for ${privilegedGroup}. This is within the generally accepted range (80% to 125%), suggesting relatively fair treatment.`;
    } else if (value < 0.8) {
      return `The rate of positive outcomes for ${unprivilegedGroup} is only ${percentage}% of the rate for ${privilegedGroup}. This is below the 80% threshold, indicating potential discrimination against ${unprivilegedGroup}.`;
    } else {
      return `The rate of positive outcomes for ${unprivilegedGroup} is ${percentage}% of the rate for ${privilegedGroup}. This is above the 125% threshold, indicating a higher rate of positive outcomes for ${unprivilegedGroup}.`;
    }
  };

  const columns = [
    {
      title: 'Attribute',
      dataIndex: 'attribute',
      key: 'attribute',
    },
    {
      title: (
        <span>
          Statistical Parity Difference{' '}
          <Tooltip title="Measures the difference in positive outcome rates between privileged and unprivileged groups. A value of 0 indicates parity, negative values indicate the unprivileged group is disadvantaged.">
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'spd',
      key: 'spd',
      render: (value, record) => (
        <Tooltip title={getExplanationForSPD(value, record.attribute)}>
          <Tag color={getColorForValue(value, 'spd')}>
            {value?.toFixed(3) ?? 'N/A'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: (
        <span>
          Disparate Impact{' '}
          <Tooltip title="The ratio of positive outcome rates between unprivileged and privileged groups. A value of 1 indicates parity, values less than 0.8 are often considered concerning.">
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </span>
      ),
      dataIndex: 'di',
      key: 'di',
      render: (value, record) => (
        <Tooltip title={getExplanationForDI(value, record.attribute)}>
          <Tag color={getColorForValue(value, 'di')}>
            {value?.toFixed(3) ?? 'N/A'}
          </Tag>
        </Tooltip>
      ),
    },
  ];

  const summaryItems = getSummaryItems(biasMetrics);

  if (summaryItems.length === 0) {
    return <Text>No summary data available.</Text>;
  }

  return (
    <Card title={<Title level={3}>Summary of Bias Metrics</Title>} style={{ marginBottom: '16px' }}>
      <Table 
        columns={columns} 
        dataSource={summaryItems} 
        pagination={false}
        rowKey="attribute"
      />
      <Text type="secondary" style={{ marginTop: '16px', display: 'block' }}>
        Green: Low bias, Yellow: Moderate bias, Red: High bias
      </Text>
    </Card>
  );
};

export default SummarySection;