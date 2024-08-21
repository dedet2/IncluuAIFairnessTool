import React from 'react';
import { Typography, Card, Divider, Space, Statistic } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import BiasMetricsChart from './BiasMetricsChart';
import OutcomeComparisonChart from './OutcomeComparisonChart';

const { Title, Paragraph, Text } = Typography;

const ReportView = ({ biasMetrics }) => {
  // Helper functions
  const getOverallBiasLevel = (metrics) => {
    const spdValues = Object.values(metrics)
      .map(m => m.overall ? m.overall.statistical_parity_difference : m.statistical_parity_difference)
      .filter(v => v !== undefined && v !== null);
    if (spdValues.length === 0) return "Unknown";
    const avgSpd = spdValues.reduce((a, b) => a + Math.abs(b), 0) / spdValues.length;
    if (avgSpd < 0.1) return "Low";
    if (avgSpd < 0.2) return "Moderate";
    return "High";
  }

  const getMostBiasedAttribute = (metrics) => {
    const validEntries = Object.entries(metrics)
      .map(([attr, m]) => [attr, m.overall ? m.overall.statistical_parity_difference : m.statistical_parity_difference])
      .filter(([_, spd]) => spd != null);
    if (validEntries.length === 0) return "Unknown";
    return validEntries.reduce((a, b) => Math.abs(a[1]) > Math.abs(b[1]) ? a : b)[0];
  }

  const getBiasDescription = (spd) => {
    if (spd == null) return "insufficient data";
    if (Math.abs(spd) < 0.1) return "low levels of bias";
    if (Math.abs(spd) < 0.2) return "moderate levels of bias";
    return "high levels of bias";
  };

  const getSPD = (metrics) => {
    return metrics.overall ? metrics.overall.statistical_parity_difference : metrics.statistical_parity_difference;
  };

  const getColorForValue = (value, metric) => {
    if (value === null || value === undefined || isNaN(value)) return 'grey';
    value = parseFloat(value);
    if (metric === 'spd') {
      if (Math.abs(value) < 0.1) return 'green';
      if (Math.abs(value) < 0.2) return 'orange';
      return 'red';
    } else if (metric === 'di') {
      if (value >= 0.8 && value <= 1.25) return 'green';
      if (value >= 0.6 && value < 0.8) return 'orange';
      return 'red';
    }
  };

  const getIconForValue = (value, metric) => {
    const color = getColorForValue(value, metric);
    if (color === 'green') return <CheckCircleOutlined style={{ color: 'green' }} />;
    if (color === 'orange') return <WarningOutlined style={{ color: 'orange' }} />;
    if (color === 'red') return <CloseCircleOutlined style={{ color: 'red' }} />;
    return <InfoCircleOutlined style={{ color: 'grey' }} />;
  };

  const interpretStatisticalParity = (value, privilegedGroup, unprivilegedGroup) => {
    if (value === null || value === undefined || isNaN(value)) return "No data available.";
    value = parseFloat(value);
    if (Math.abs(value) < 0.1) {
      return `The difference in positive outcome rates between ${privilegedGroup} and ${unprivilegedGroup} is small (${(value * 100).toFixed(1)}%), suggesting relatively fair treatment.`;
    } else if (value < 0) {
      return `${unprivilegedGroup} have a ${Math.abs((value * 100).toFixed(1))}% lower rate of positive outcomes compared to ${privilegedGroup}. This difference suggests potential bias against ${unprivilegedGroup}.`;
    } else {
      return `${unprivilegedGroup} have a ${(value * 100).toFixed(1)}% higher rate of positive outcomes compared to ${privilegedGroup}. This difference suggests potential bias in favor of ${unprivilegedGroup}.`;
    }
  };
  
  const interpretDisparateImpact = (value, privilegedGroup, unprivilegedGroup) => {
    if (value === null || value === undefined || isNaN(value)) return "No data available.";
    value = parseFloat(value);
    
    const percentage = (value * 100).toFixed(0);
    const examplePrivileged = 100;
    const exampleUnprivileged = Math.round(value * 100);
  
    if (value >= 0.8 && value <= 1.25) {
      return `The rate of positive outcomes for ${unprivilegedGroup} is ${percentage}% of the rate for ${privilegedGroup}. In other words, for every ${examplePrivileged} positive outcomes in the ${privilegedGroup} group, there are ${exampleUnprivileged} in the ${unprivilegedGroup} group. This is within the generally accepted range (80% to 125%), suggesting relatively fair treatment.`;
    } else if (value < 0.8) {
      return `The rate of positive outcomes for ${unprivilegedGroup} is only ${percentage}% of the rate for ${privilegedGroup}. In other words, for every ${examplePrivileged} positive outcomes in the ${privilegedGroup} group, there are only ${exampleUnprivileged} in the ${unprivilegedGroup} group. This is below the 80% threshold, indicating potential discrimination against ${unprivilegedGroup}.`;
    } else {
      return `The rate of positive outcomes for ${unprivilegedGroup} is ${percentage}% of the rate for ${privilegedGroup}. In other words, for every ${examplePrivileged} positive outcomes in the ${privilegedGroup} group, there are ${exampleUnprivileged} in the ${unprivilegedGroup} group. This is above the 125% threshold, indicating a higher rate of positive outcomes for ${unprivilegedGroup}.`;
    }
  };

  const renderMetricSection = (title, metrics, interpretFunction) => {
    let displayValue = 'N/A';
    let numericValue = null;

    if (metrics.value != null && !isNaN(parseFloat(metrics.value))) {
      numericValue = parseFloat(metrics.value);
      displayValue = numericValue.toFixed(3);
    }

    return (
      <Card style={{ marginBottom: 20 }}>
        <Space direction="vertical" size="middle">
          <Title level={4}>{title}</Title>
          <Statistic
            value={displayValue}
            precision={3}
            valueStyle={{ 
              color: getColorForValue(numericValue, title.toLowerCase().includes('parity') ? 'spd' : 'di')
            }}
            prefix={getIconForValue(numericValue, title.toLowerCase().includes('parity') ? 'spd' : 'di')}
          />
          <Paragraph>
            <Text strong>Interpretation: </Text>
            {interpretFunction(metrics.value, metrics.privilegedGroup, metrics.unprivilegedGroup)}
          </Paragraph>
        </Space>
      </Card>
    );
  };

  const getDatasetInfo = () => {
    const attributes = Object.keys(biasMetrics).filter(key => key !== 'outcome_rates');
    const attributeCount = attributes.length;
    const attributeList = attributes.join(', ');

    return { attributeCount, attributeList };
  };

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <Title>Data Analytical Report: Bias Metrics Analysis</Title>
      
      <Divider />

      <Title level={2}>Summary</Title>
      <Paragraph>
        The purpose of this report is to understand and quantify potential biases in our dataset or model outcomes. 
        The analysis covers various attributes such as gender, race, age, and education level. Our findings indicate 
        an overall bias level of <Text strong>{getOverallBiasLevel(biasMetrics)}</Text>, with the 
        <Text strong> {getMostBiasedAttribute(biasMetrics)}</Text> attribute showing the most significant bias.
      </Paragraph>

      <Divider />

      <Title level={2}>Data</Title>
      {(() => {
        const { attributeCount, attributeList } = getDatasetInfo();
        return (
          <>
            <Paragraph>
              The dataset analyzed in this report consists of bias metrics across {attributeCount} different attributes. 
              These attributes include: <Text strong>{attributeList}</Text>. This comprehensive set of attributes 
              allows us to examine potential biases across various demographic and organizational dimensions.
            </Paragraph>
            {biasMetrics.outcome_rates && (
              <Paragraph>
                Additionally, we have outcome rate data that provides insights into the actual disparities 
                in positive outcomes between privileged and unprivileged groups for each attribute.
              </Paragraph>
            )}
          </>
        );
      })()}
      <Paragraph>
        The importance of this data analysis lies in its potential to:
        <ul>
          <li>Inform strategic decision-making and policy formulation</li>
          <li>Identify and address potential discriminatory practices</li>
          <li>Enhance fairness and equality in our processes</li>
          <li>Mitigate legal and reputational risks associated with biased outcomes</li>
        </ul>
      </Paragraph>

      <Divider />

      <Title level={2}>Method</Title>
      <Paragraph>
        This analysis employs quantitative data analysis methods, specifically focusing on two key metrics:
        <ul>
          <li><Text strong>Statistical Parity Difference (SPD):</Text> Measures the difference in positive outcome rates between privileged and unprivileged groups.</li>
          <li><Text strong>Disparate Impact (DI):</Text> Calculates the ratio of positive outcome rates between unprivileged and privileged groups.</li>
        </ul>
        These metrics were chosen for their ability to quantify bias across different attributes and their interpretability in the context of fairness in decision-making processes.
      </Paragraph>

      <Divider />

      <Title level={2}>Analysis</Title>
      
      <Title level={3}>Overview of Bias Metrics</Title>
      <BiasMetricsChart metrics={biasMetrics} />
      <Paragraph>
        The chart above provides a visual representation of SPD and DI across all examined attributes. 
        Longer bars and more intense colors indicate higher levels of bias.
      </Paragraph>

      <Title level={3}>Detailed Findings by Attribute</Title>
      {Object.entries(biasMetrics).map(([attr, metrics]) => {
        if (attr === 'outcome_rates') return null;
        const spd = getSPD(metrics);
        const di = metrics.disparate_impact;
        return (
          <Card key={attr} style={{ marginBottom: 20 }}>
            <Title level={4}>{attr}</Title>
            <Paragraph>
              <Text strong>Statistical Parity Difference:</Text> {spd?.toFixed(3) || 'N/A'}
              <br />
              <Text strong>Disparate Impact:</Text> {di?.toFixed(3) || 'N/A'}
            </Paragraph>
            <Paragraph>
              {interpretStatisticalParity(spd, "Privileged Group", "Unprivileged Group")}
            </Paragraph>
            <Paragraph>
              {interpretDisparateImpact(di, "Privileged Group", "Unprivileged Group")}
            </Paragraph>
          </Card>
        );
      })}

      <Title level={3}>Outcome Rates Comparison</Title>
      {biasMetrics.outcome_rates && <OutcomeComparisonChart data={biasMetrics.outcome_rates} />}
      <Paragraph>
        This chart illustrates the actual disparities in positive outcome rates between privileged and unprivileged groups across different attributes.
      </Paragraph>

      <Divider />

      <Title level={2}>Conclusion</Title>
      <Paragraph>
        Our analysis reveals a {getOverallBiasLevel(biasMetrics).toLowerCase()} level of overall bias in the examined data, 
        with the {getMostBiasedAttribute(biasMetrics)} attribute showing the most significant disparity. 
        These findings suggest that there are areas where our processes or models may be producing unfair outcomes 
        for certain groups.
      </Paragraph>
      <Paragraph>
        Based on these results, we recommend the following actions:
        <ol>
          <li>Conduct a deeper investigation into the factors contributing to bias in the {getMostBiasedAttribute(biasMetrics)} attribute.</li>
          <li>Review and potentially revise data collection and processing methods, particularly for attributes showing high levels of bias.</li>
          <li>Consider implementing bias mitigation techniques in our models or decision-making processes.</li>
          <li>Establish a regular monitoring system to track bias metrics over time and assess the impact of any interventions.</li>
          <li>Provide training to relevant staff on recognizing and mitigating bias in data-driven processes.</li>
        </ol>
      </Paragraph>
      <Paragraph>
        By addressing these biases, we can work towards more fair and equitable outcomes, reduce potential legal and reputational risks, 
        and improve the overall quality and reliability of our data-driven decision-making processes.
      </Paragraph>
    </div>
  );
};

export default ReportView;