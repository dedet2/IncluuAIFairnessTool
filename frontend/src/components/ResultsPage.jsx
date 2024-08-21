import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Typography, Tabs, Tag, Tooltip, Progress, Row, Col } from 'antd';
import RawDataChart from './RawDataChart';
import { InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import Joyride, { STATUS } from 'react-joyride';
import SummarySection from './SummarySection';
import BiasMetricsChart from './BiasMetricsChart';
import OutcomeComparisonChart from './OutcomeComparisonChart';
import GlossaryModal from './GlossaryModal';
import ReportView from './ReportView';
import InteractiveDashboard from './InteractiveDashboard';
import FloatingGlossaryButton from './FloatingGlossaryButton';
import './ResultsPage.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const ResultsPage = () => {
  const location = useLocation();
  const { biasMetrics, datasetType } = location.state || {};
  const [isGlossaryVisible, setIsGlossaryVisible] = useState(false);
  const [runTutorial, setRunTutorial] = useState(true);
  const roundTo = (num, decimals = 3) => {
    if (num === null || num === undefined || isNaN(num)) {
      return 'N/A';
    }
    return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals).toFixed(decimals);
  };
  const steps = [
    {
      target: '.results-page',
      content: 'Welcome to your Bias Metrics Results! This tutorial will guide you through the main sections of the report.',
      disableBeacon: true,
    },
    {
      target: '.ant-tabs-tab:nth-child(1)',
      content: 'The Overview tab provides a summary of the bias metrics across all attributes.',
    },
    {
      target: '.summary-section',
      content: 'Here you can see a quick summary of the Statistical Parity Difference and Disparate Impact for each attribute.',
    },
    {
      target: '.bias-metrics-chart',
      content: 'This chart visualizes the bias metrics, allowing you to quickly identify areas of concern.',
    },
    {
      target: '.outcome-comparison-chart',
      content: 'This chart shows the actual outcome rates for privileged and unprivileged groups across attributes.',
    },
    {
      target: '.ant-tabs-tab:nth-child(2)',
      content: 'The Report View tab provides a more detailed, narrative explanation of the results.',
    },
    {
      target: '.ant-tabs-tab:nth-child(3)',
      content: 'The Detailed Metrics tab allows you to dive deep into the metrics for each individual attribute.',
    },
    {
      target: '.glossary-button',
      content: 'Don\'t forget to check the Glossary for explanations of key terms and metrics!',
    },
  ];

  useEffect(() => {
    setIsGlossaryVisible(true);
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTutorial(false);
    }
  };

  const toggleGlossary = () => {
    setIsGlossaryVisible(!isGlossaryVisible);
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
    return 'grey'; // default color
  };

  const getIconForValue = (value, metric) => {
    const color = getColorForValue(value, metric);
    if (color === 'green') return <CheckCircleOutlined style={{ color: 'green' }} />;
    if (color === 'orange') return <WarningOutlined style={{ color: 'orange' }} />;
    if (color === 'red') return <CloseCircleOutlined style={{ color: 'red' }} />;
    return <InfoCircleOutlined style={{ color: 'grey' }} />;
  };

  const interpretStatisticalParity = (value, privilegedGroup, unprivilegedGroup) => {
    if (value === null || value === 'N/A') return "No data available.";
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
    if (value === null || value === 'N/A') return "No data available.";
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

  const renderMetric = (title, value, description, interpretation, privilegedGroup, unprivilegedGroup) => {
  let displayValue = value;
  let metric = title.toLowerCase().includes('parity') ? 'spd' : 'di';

  if (typeof value === 'object' && value !== null) {
    displayValue = value.value === null ? 'N/A' : roundTo(value.value);
  } else if (value !== 'Unavailable' && value !== 'N/A') {
    displayValue = roundTo(value);
  }

  const color = getColorForValue(displayValue, metric);

  return (
    <Card 
      title={
        <span>
          {title}{' '}
          <Tooltip title={description}>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </span>
      } 
      style={{ marginBottom: '16px' }}
    >
      <Paragraph>
        <strong>Value:</strong> <Tag color={color}>{displayValue}</Tag>
      </Paragraph>
      <Paragraph>
        <strong>Interpretation:</strong> {interpretation(displayValue, privilegedGroup, unprivilegedGroup)}
      </Paragraph>
    </Card>
  );
};

const renderBinaryMetrics = (metrics, attributeName) => {
  let privilegedGroup, unprivilegedGroup;
  switch(attributeName) {
    case 'Gender':
      privilegedGroup = 'Males';
      unprivilegedGroup = 'Females';
      break;
    case 'Age':
      privilegedGroup = 'Young (< 40)';
      unprivilegedGroup = 'Old (≥ 40)';
      break;
    case 'Disability':
      privilegedGroup = 'No Disability';
      unprivilegedGroup = 'With Disability';
      break;
      case 'SexualOrientation':
        privilegedGroup = 'Heterosexual';
        unprivilegedGroup = 'LGBTQIA+';
        break;
    case 'Religion':
      privilegedGroup = 'Reference Religion';
      unprivilegedGroup = 'Other Religions';
      break;
    default:
      privilegedGroup = 'Privileged Group';
      unprivilegedGroup = 'Unprivileged Group';
  }
    
    return (
      <Row gutter={[16, 16]}>
        {renderMetric(
          "Statistical Parity Difference",
          metrics.statistical_parity_difference,
          "The difference in positive outcome rates between the privileged and unprivileged groups. A value of 0 indicates parity, negative values indicate the unprivileged group is disadvantaged.",
          interpretStatisticalParity,
          privilegedGroup,
          unprivilegedGroup
        )}
        {renderMetric(
          "Disparate Impact",
          metrics.disparate_impact,
          "The ratio of positive outcome rates between the unprivileged and privileged groups. A value of 1 indicates parity, values less than 0.8 are often considered concerning.",
          interpretDisparateImpact,
          privilegedGroup,
          unprivilegedGroup
        )}
      </Row>
    );
  };

  const renderRaceMetrics = (metrics) => {
    const { overall, group_metrics } = metrics;
    
    const renderComparisonTab = (race1, race2) => {
      const comparisonMetrics = group_metrics[race1] && group_metrics[race1][race2] ? group_metrics[race1][race2] : {};
      
      return (
        <div>
          {renderMetric(
            "Statistical Parity Difference",
            comparisonMetrics.statistical_parity_difference,
            "Measures the difference in positive outcome rates between two groups. A value of 0 indicates parity.",
            interpretStatisticalParity,
            race1,
            race2
          )}
          {renderMetric(
            "Disparate Impact",
            comparisonMetrics.disparate_impact,
            "Measures the ratio of positive outcome rates between two groups. A value of 1 indicates parity, values below 0.8 or above 1.25 often indicate potential discrimination.",
            interpretDisparateImpact,
            race1,
            race2
          )}
        </div>
      );
    };
  
    const comparisons = [
      ['White', 'Black'],
      ['White', 'Hispanic'],
      ['White', 'Asian'],
      ['Black', 'Hispanic'],
      ['Black', 'Asian'],
      ['Hispanic', 'Asian']
    ];
  
    return (
      <>
        <Card title="Overall Race Metrics" style={{ marginBottom: '16px' }}>
          {renderMetric(
            "Statistical Parity Difference",
            overall.statistical_parity_difference,
            "Measures the overall difference in positive outcome rates between White and other racial groups.",
            interpretStatisticalParity,
            "White",
            "Other racial groups"
          )}
          {renderMetric(
            "Disparate Impact",
            overall.disparate_impact,
            "Measures the overall ratio of positive outcome rates between White and other racial groups.",
            interpretDisparateImpact,
            "White",
            "Other racial groups"
          )}
          <Paragraph>
            <Text type="secondary">Note: Overall metrics use White as the reference group.</Text>
          </Paragraph>
        </Card>
        <Card title="Pairwise Race Comparisons" style={{ marginBottom: '16px' }}>
          <Tabs defaultActiveKey={`${comparisons[0][0]}-${comparisons[0][1]}`}>
            {comparisons.map(([race1, race2]) => (
              <TabPane tab={`${race1} vs ${race2}`} key={`${race1}-${race2}`}>
                {renderComparisonTab(race1, race2)}
              </TabPane>
            ))}
          </Tabs>
        </Card>
      </>
    );
  };

  const renderEducationMetrics = (metrics) => {
    const { overall, group_metrics } = metrics;
  
    const renderComparisonTab = (edu1, edu2) => {
      const comparisonMetrics = group_metrics[edu1] && group_metrics[edu1][edu2] ? group_metrics[edu1][edu2] : {};
    
      return (
        <div>
          {renderMetric(
            "Statistical Parity Difference",
            comparisonMetrics.statistical_parity_difference,
            "Measures the difference in positive outcome rates between two groups. A value of 0 indicates parity.",
            interpretStatisticalParity,
            edu1,
            edu2
          )}
          {renderMetric(
            "Disparate Impact",
            comparisonMetrics.disparate_impact,
            "Measures the ratio of positive outcome rates between two groups. A value of 1 indicates parity, values below 0.8 or above 1.25 often indicate potential discrimination.",
            interpretDisparateImpact,
            edu1,
            edu2
          )}
        </div>
      );
    };

    const educationLevels = ['High School', 'Bachelor', 'Master', 'PhD'];
    const comparisons = [];
    for (let i = 0; i < educationLevels.length; i++) {
      for (let j = i + 1; j < educationLevels.length; j++) {
        comparisons.push([educationLevels[i], educationLevels[j]]);
      }
    }

    return (
      <>
        <Card title="Overall Education Metrics" style={{ marginBottom: '16px' }}>
          {renderMetric(
            "Statistical Parity Difference",
            overall.statistical_parity_difference,
            "Measures the overall difference in positive outcome rates between the highest education level (PhD) and other education levels.",
            interpretStatisticalParity,
            "PhD",
            "Other education levels"
          )}
          {renderMetric(
            "Disparate Impact",
            overall.disparate_impact,
            "Measures the overall ratio of positive outcome rates between the highest education level (PhD) and other education levels.",
            interpretDisparateImpact,
            "PhD",
            "Other education levels"
          )}
          <Paragraph>
            <Text type="secondary">Note: Overall metrics use PhD as the reference group.</Text>
          </Paragraph>
        </Card>
        <Card title="Pairwise Education Comparisons" style={{ marginBottom: '16px' }}>
          <Tabs defaultActiveKey={`${comparisons[0][0]}-${comparisons[0][1]}`}>
            {comparisons.map(([edu1, edu2]) => (
              <TabPane tab={`${edu1} vs ${edu2}`} key={`${edu1}-${edu2}`}>
                {renderComparisonTab(edu1, edu2)}
              </TabPane>
            ))}
          </Tabs>
        </Card>
      </>
    );
  };

  const renderMetricsForAttribute = (metrics, attributeName) => {
    console.log(`Rendering metrics for ${attributeName}:`, metrics);
  
    return (
      <>
        {attributeName === 'Race' && renderRaceMetrics(metrics)}
        {attributeName === 'Education' && renderEducationMetrics(metrics)}
        {attributeName === 'Religion' && renderBinaryMetrics(metrics, 'Religion')}
        {attributeName === 'SexualOrientation' && renderBinaryMetrics(metrics, 'SexualOrientation')}
        {(attributeName !== 'Race' && attributeName !== 'Education' && attributeName !== 'Religion' && attributeName !== 'SexualOrientation') && renderBinaryMetrics(metrics, attributeName)}
        {metrics.raw_data && metrics.raw_data[attributeName] && (
          <Card title={`Raw Data for ${attributeName}`} style={{ marginTop: '16px' }}>
            <RawDataChart data={metrics.raw_data} attributeName={attributeName} />
          </Card>
        )}
      </>
    );
  };
    
    
  const renderOverviewTab = (data) => (
    <>
      <SummarySection biasMetrics={data} />
      <Card title="Bias Metrics Visualization" style={{ marginBottom: '16px' }}>
        <BiasMetricsChart metrics={data} />
      </Card>
      {data.outcome_rates && (
        <Card title="Positive Outcome Rates Comparison" style={{ marginBottom: '16px' }}>
          <OutcomeComparisonChart data={data.outcome_rates} referenceReligion={location.state.referenceReligion} />
          <Paragraph style={{ marginTop: 16 }}>
            This chart shows the percentage of positive outcomes for privileged and unprivileged groups across different attributes.
            It provides context for the bias metrics by visualizing the actual disparities in outcomes.
          </Paragraph>
        </Card>
      )}
    </>
  );
  
  return (
    <div className="results-page">
      <Title level={2}>Bias Metrics Results</Title>
      <Paragraph>
        These metrics provide insights into potential biases in the dataset or model outcomes. 
        Interpret these results carefully and consider them in the context of your specific use case.
      </Paragraph>
      <Tabs defaultActiveKey="overview">
        <TabPane tab="Overview" key="overview">
          {renderOverviewTab(biasMetrics.original)}
        </TabPane>
        <TabPane tab="Report View" key="report-view">
          <ReportView biasMetrics={biasMetrics.original} />
        </TabPane>
        <TabPane tab="Detailed Metrics" key="detailed">
  <Tabs>
    {Object.entries(biasMetrics.original)
      .filter(([attr]) => attr !== 'outcome_rates' && attr !== 'raw_data')
      .map(([attr, metrics]) => {
        const displayAttr = attr === 'Religion_reference' ? 'Religion' : 
                            attr === 'SexualOrientation' ? 'Sexual Orientation' : attr;
        return (
          <TabPane tab={displayAttr} key={attr}>
            {renderMetricsForAttribute({...metrics, raw_data: biasMetrics.original.raw_data}, displayAttr)}
          </TabPane>
        );
      })}
  </Tabs>
</TabPane>
        {datasetType === 'training' && biasMetrics.reweighed && Object.keys(biasMetrics.reweighed).length > 0 && (
          <TabPane tab="Reweighed Data" key="reweighed">
            {biasMetrics.reweighed.error ? (
              <Typography.Text type="danger">Error processing reweighed data: {biasMetrics.reweighed.error}</Typography.Text>
            ) : (
              renderMetricsOrError(biasMetrics.reweighed)
            )}
          </TabPane>
        )}
      </Tabs>
      <FloatingGlossaryButton onClick={toggleGlossary} />
      <GlossaryModal 
        visible={isGlossaryVisible} 
        onClose={() => setIsGlossaryVisible(false)} 
      />
    </div>
  );
  const renderMetricsOrError = (data) => {
    if (data.error) {
      return <Text type="danger">{data.error}</Text>;
    }
    return (
      <Tabs defaultActiveKey="overview">
  <TabPane tab="Overview" key="overview">
    {renderOverviewTab(biasMetrics.original)}
  </TabPane>
  <TabPane tab="Report View" key="report-view">
    <ReportView biasMetrics={biasMetrics.original} />
  </TabPane>
  <TabPane tab="Detailed Metrics" key="detailed">
    <Tabs>
      {Object.entries(biasMetrics.original)
         .filter(([attr]) => attr !== 'outcome_rates' && attr !== 'raw_data')
        .map(([attr, metrics]) => (
          <TabPane tab={attr} key={attr}>
            {renderMetricsForAttribute(metrics, attr)}
          </TabPane>
        ))}
    </Tabs>
  </TabPane>
  {datasetType === 'training' && biasMetrics.reweighed && Object.keys(biasMetrics.reweighed).length > 0 && (
    <TabPane tab="Reweighed Data" key="reweighed">
      {biasMetrics.reweighed.error ? (
        <Typography.Text type="danger">Error processing reweighed data: {biasMetrics.reweighed.error}</Typography.Text>
      ) : (
        renderMetricsOrError(biasMetrics.reweighed)
      )}
    </TabPane>
  )}
</Tabs>
    );
  };

  return (
    <div className="results-page">
      <Title level={2}>Bias Metrics Results</Title>
      <Paragraph>
        These metrics provide insights into potential biases in the dataset or model outcomes. 
        Interpret these results carefully and consider them in the context of your specific use case.
      </Paragraph>
      <Tabs defaultActiveKey="overview">
        <TabPane tab="Overview" key="overview">
          {renderOverviewTab(biasMetrics.original)}
        </TabPane>
        <TabPane tab="Report View" key="report-view">
          <ReportView biasMetrics={biasMetrics.original} />
        </TabPane>
        <TabPane tab="Detailed Metrics" key="detailed">
          <Tabs>
            {Object.entries(biasMetrics.original)
              .filter(([attr]) => attr !== 'outcome_rates' && attr !== 'raw_data')
              .map(([attr, metrics]) => (
                <TabPane tab={attr} key={attr}>
                  {renderMetricsForAttribute(metrics, attr)}
                </TabPane>
              ))}
          </Tabs>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ResultsPage;