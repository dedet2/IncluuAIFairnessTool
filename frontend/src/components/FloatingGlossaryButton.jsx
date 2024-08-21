import React from 'react';
import { Button } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './FloatingGlossaryButton.css';

const FloatingGlossaryButton = ({ onClick }) => {
  return (
    <Button
      className="floating-glossary-button"
      type="primary"
      shape="circle"
      icon={<QuestionCircleOutlined />}
      onClick={onClick}
      size="large"
    />
  );
};

export default FloatingGlossaryButton;