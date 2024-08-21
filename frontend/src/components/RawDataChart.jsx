import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Typography } from 'antd';

const { Paragraph } = Typography;

const RawDataChart = ({ data, attributeName }) => {
  if (!data || !data[attributeName]) {
    return <Paragraph>No raw data available for {attributeName}</Paragraph>;
  }

  let chartData;
  if (attributeName === 'Religion_reference') {
    chartData = Object.entries(data['Religion'])
      .filter(([religion]) => religion !== 'reference')
      .map(([religion, counts]) => ({
        name: religion,
        ApprovalRate: (counts.approved / counts.total) * 100,
        DenialRate: ((counts.total - counts.approved) / counts.total) * 100,
        total: counts.total
      }));
  } else {
    chartData = Object.entries(data[attributeName]).map(([group, counts]) => ({
      name: group,
      ApprovalRate: (counts.approved / counts.total) * 100,
      DenialRate: ((counts.total - counts.approved) / counts.total) * 100,
      total: counts.total
    }));
  }

  chartData.sort((a, b) => b.total - a.total);

  const getGroupLabel = (group) => {
    const labels = {
      Gender: { '0.0': 'Female', '1.0': 'Male' },
      Race: { '0.0': 'Black', '1.0': 'Hispanic', '2.0': 'Asian', '3.0': 'White' },
      Age: { '0.0': 'Old (≥40)', '1.0': 'Young (<40)' },
      Education: { '0.0': 'High School', '1.0': 'Bachelor', '2.0': 'Master', '3.0': 'PhD' },
      Disability: { '0.0': 'Yes', '1.0': 'No' },
      SexualOrientation: { '0.0': 'LGBTQIA+', '1.0': 'Heterosexual' },
    };
    
    return (attributeName === 'Religion_reference' || attributeName === 'Religion') 
      ? group 
      : (labels[attributeName]?.[group] || group);
  };

  return (
    <Card title={`Approval Rates for ${attributeName === 'Religion_reference' ? 'Religion' : attributeName}`}>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barSize={50}  // Fixed bar size
            maxBarSize={60}  // Maximum bar size
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tickFormatter={getGroupLabel}
              interval={0}
              angle={0}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              label={{ value: 'Percentage', angle: -90, position: 'insideLeft' }} 
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip 
              formatter={(value, name, props) => [`${value.toFixed(2)}%`, name]}
              labelFormatter={(value) => `${getGroupLabel(value)} (n=${chartData.find(item => item.name === value).total})`}
            />
            <Legend />
            <Bar dataKey="ApprovalRate" stackId="a" fill="#1890ff" name="Approval Rate" />
            <Bar dataKey="DenialRate" stackId="a" fill="#FF7F0E" name="Denial Rate" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Paragraph style={{ marginTop: 16 }}>
        This chart shows the approval and denial rates for each group within the {attributeName === 'Religion_reference' ? 'Religion' : attributeName} attribute.
        The blue portion represents the approval rate, while the orange portion represents the denial rate.
        Each bar represents 100% of the cases for that group, and the relative sizes of the blue and orange sections show the proportions of approvals and denials.
        The groups are ordered by sample size, with the largest samples on the left.
        Hover over each bar to see the exact percentages and sample sizes.
      </Paragraph>
    </Card>
  );
};

export default RawDataChart;