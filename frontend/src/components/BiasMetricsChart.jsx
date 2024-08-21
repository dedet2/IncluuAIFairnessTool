import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Typography, Space, Row, Col, Card } from 'antd';

const { Title, Text } = Typography;

const BiasMetricsChart = ({ metrics }) => {
  const processData = (metricType) => {
    return Object.entries(metrics)
      .filter(([attr]) => attr !== 'outcome_rates')
      .map(([attr, values]) => {
        let value;
        if (attr === 'Race' || attr === 'Education') {
          value = values.overall?.[metricType];
        } else {
          value = values[metricType];
        }
        return {
          name: attr,
          value: value,
        };
      })
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  };

  const spdData = processData('statistical_parity_difference');
  const diData = processData('disparate_impact');

  const CustomTooltip = ({ active, payload, label, metric }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      let interpretation;
      if (metric === 'SPD') {
        if (Math.abs(value) < 0.1) {
          interpretation = "Low bias";
        } else if (Math.abs(value) < 0.2) {
          interpretation = "Moderate bias";
        } else {
          interpretation = "High bias";
        }
      } else { // DI
        if (value >= 0.8 && value <= 1.25) {
          interpretation = "Low bias";
        } else if ((value >= 0.6 && value < 0.8) || (value > 1.25 && value <= 1.67)) {
          interpretation = "Moderate bias";
        } else {
          interpretation = "High bias";
        }
      }
      return (
        <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ margin: 0 }}><strong>{label}</strong></p>
          <p style={{ margin: 0 }}>{metric}: {value.toFixed(3)}</p>
          <p style={{ margin: 0 }}>{interpretation}</p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (data, title, metric, domain, referenceLine) => (
    <Card title={<Title level={5}>{title}</Title>} style={{ height: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" domain={domain} />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip content={(props) => CustomTooltip({ ...props, metric })} />
          <ReferenceLine x={referenceLine} stroke="#666" />
          <Bar dataKey="value" fill="#1890ff" barSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );

  const renderInterpretationGuide = (metric) => (
    <Card title={<Text strong>How to interpret:</Text>} style={{ height: '100%' }}>
      <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
        {metric === 'SPD' ? (
          <>
            <li>Bars closer to 0 indicate lower bias</li>
            <li>Longer bars indicate higher levels of bias</li>
            <li>Negative values: unprivileged group has lower positive outcome rate</li>
            <li>Positive values: unprivileged group has higher positive outcome rate</li>
          </>
        ) : (
          <>
            <li>Bars closer to 1 indicate lower bias</li>
            <li>Values between 0.8 and 1.25 are generally considered low bias</li>
            <li>Values below 1: unprivileged group has lower positive outcome rate</li>
            <li>Values above 1: unprivileged group has higher positive outcome rate</li>
          </>
        )}
      </ul>
    </Card>
  );

   return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          {renderChart(spdData, "Statistical Parity Difference", "SPD", [-1, 1], 0)}
        </Col>
        <Col span={12}>
          {renderChart(diData, "Disparate Impact", "DI", [0, 2], 1)}
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          {renderInterpretationGuide('SPD')}
        </Col>
        <Col span={12}>
          {renderInterpretationGuide('DI')}
        </Col>
      </Row>
    </Space>
  );
};

export default BiasMetricsChart;