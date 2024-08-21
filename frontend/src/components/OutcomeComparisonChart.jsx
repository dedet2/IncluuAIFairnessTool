import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const OutcomeComparisonChart = ({ data, referenceReligion, referenceSexualOrientation }) => {
  const processedData = Object.entries(data).reduce((acc, [attribute, values]) => {
    if (attribute.startsWith('Religion_')) {
      if (!acc['Religion']) {
        acc['Religion'] = {
          privileged: 0,
          unprivileged: 0,
          privilegedCount: 0,
          unprivilegedCount: 0
        };
      }
      
      const religionName = attribute.split('_')[1];
      if (religionName === referenceReligion) {
        acc['Religion'].privileged += values.privileged;
        acc['Religion'].privilegedCount++;
      } else {
        acc['Religion'].unprivileged += values.unprivileged;
        acc['Religion'].unprivilegedCount++;
      }
    } else if (attribute === 'SexualOrientation') {
      if (!acc['Sexual Orientation']) {
        acc['Sexual Orientation'] = {
          privileged: 0,
          unprivileged: 0,
          privilegedCount: 0,
          unprivilegedCount: 0
        };
      }
      if (values.privileged === referenceSexualOrientation) {
        acc['Sexual Orientation'].privileged += values.privileged;
        acc['Sexual Orientation'].privilegedCount++;
      } else {
        acc['Sexual Orientation'].unprivileged += values.unprivileged;
        acc['Sexual Orientation'].unprivilegedCount++;
      }
    } else {
      acc[attribute] = values;
    }
    return acc;
  }, {});

  const chartData = Object.entries(processedData).map(([attribute, values]) => {
    if (attribute === 'Religion') {
      return {
        name: attribute,
        Privileged: (values.privileged / values.privilegedCount) * 100,
        Unprivileged: (values.unprivileged / values.unprivilegedCount) * 100
      };
    } else {
      return {
        name: attribute,
        Privileged: values.privileged * 100,
        Unprivileged: values.unprivileged * 100
      };
    }
  });

  console.log("Processed chart data:", chartData);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" unit="%" domain={[0, 100]} />
        <YAxis dataKey="name" type="category" width={100} />
        <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
        <Legend />
        <Bar dataKey="Privileged" fill="#1890ff" name="Privileged Group" />
        <Bar dataKey="Unprivileged" fill="#FF7F0E" name="Unprivileged Group" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default OutcomeComparisonChart;