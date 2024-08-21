import React from 'react';
import { Modal, Typography, Divider } from 'antd';

const { Title, Paragraph, Text } = Typography;

const GlossaryModal = ({ visible, onClose }) => {
  return (
    <Modal
      title="Understanding Bias Metrics"
      visible={visible}
      onOk={onClose}
      onCancel={onClose}
      width={700}
    >
      <Typography>
        <Paragraph>
          Welcome to the Bias Metrics Dashboard. Here's a quick guide to help you understand the key metrics and terms used in our analysis.
        </Paragraph>
        
        <Title level={4}>Key Terms</Title>
        <Divider />
        
        <Title level={5}>Statistical Parity Difference (SPD)</Title>
        <Paragraph>
          Measures the difference in positive outcome rates between privileged and unprivileged groups. 
          A value of 0 indicates parity, negative values indicate the unprivileged group is disadvantaged.
        </Paragraph>
        
        <Title level={5}>Disparate Impact (DI)</Title>
        <Paragraph>
          The ratio of positive outcome rates between unprivileged and privileged groups. 
          A value of 1 indicates parity, values less than 0.8 are often considered concerning.
        </Paragraph>
        
        <Title level={4}>How to Interpret Results</Title>
        <Divider />
        
        <Paragraph>
          <Text strong>SPD Interpretation:</Text>
          <ul>
            <li>Values close to 0 indicate lower bias</li>
            <li>Negative values: unprivileged group has lower positive outcome rate</li>
            <li>Positive values: unprivileged group has higher positive outcome rate</li>
          </ul>
        </Paragraph>
        
        <Paragraph>
          <Text strong>DI Interpretation:</Text>
          <ul>
            <li>Values between 0.8 and 1.25 are generally considered low bias</li>
            <li>Values below 1: unprivileged group has lower positive outcome rate</li>
            <li>Values above 1: unprivileged group has higher positive outcome rate</li>
          </ul>
        </Paragraph>
        
        <Paragraph>
          Remember, these metrics provide insights into potential biases. Always consider them in the context of your specific use case and dataset.
        </Paragraph>
      </Typography>
    </Modal>
  );
};

export default GlossaryModal;