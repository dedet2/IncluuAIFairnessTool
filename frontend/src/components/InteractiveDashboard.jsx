import React, { useState } from 'react';
import { Card, Tabs, Typography, Tooltip, Button, Space, Badge } from 'antd';
import { InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import OutcomeComparisonChart from './OutcomeComparisonChart';
import BiasMetricsChart from './BiasMetricsChart';
import GlossaryModal from './GlossaryModal';

const { TabPane } = Tabs;
const { Title, Paragraph } = Typography;

const InteractiveDashboard = ({ biasMetrics }) => {
  const [activeTab, setActiveTab] = useState('1');
  const [isGlossaryVisible, setIsGlossaryVisible] = useState(false);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const toggleGlossary = () => {
    setIsGlossaryVisible(!isGlossaryVisible);
  };

  const renderHelpButton = () => (
    <Badge dot>
      <Button 
        type="text" 
        icon={<QuestionCircleOutlined />} 
        onClick={toggleGlossary}
        style={{ marginLeft: '8px' }}
      >
        Help
      </Button>
    </Badge>
  );

  return (
    <Card 
      title={
        <Space>
          <Title level={3}>Bias Metrics Dashboard</Title>
          {renderHelpButton()}
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={handleTabChange}>
        <TabPane tab="Outcome Comparison" key="1">
          <Paragraph>
            This chart shows the positive outcome rates for privileged and unprivileged groups across different attributes.
            <Tooltip title="A higher bar indicates a higher rate of positive outcomes for that group.">
              <InfoCircleOutlined style={{ marginLeft: '8px' }} />
            </Tooltip>
          </Paragraph>
          <OutcomeComparisonChart data={biasMetrics.outcome_rates} referenceReligion={biasMetrics.referenceReligion} />
        </TabPane>
        <TabPane tab="Bias Metrics" key="2">
          <Paragraph>
            These charts show two key bias metrics: Statistical Parity Difference (SPD) and Disparate Impact (DI).
            <Tooltip title="Click on the Help button for detailed explanations of these metrics.">
              <InfoCircleOutlined style={{ marginLeft: '8px' }} />
            </Tooltip>
          </Paragraph>
          <BiasMetricsChart metrics={biasMetrics} />
        </TabPane>
      </Tabs>
      <Space style={{ marginTop: '16px' }}>
        <Button 
          type="primary" 
          onClick={() => {/* Add functionality to generate report */}}
        >
          Generate Detailed Report
        </Button>
        <Button onClick={toggleGlossary}>
          Open Glossary
        </Button>
      </Space>
      <GlossaryModal 
        visible={isGlossaryVisible} 
        onClose={toggleGlossary}
      />
    </Card>
  );
};

export default InteractiveDashboard;