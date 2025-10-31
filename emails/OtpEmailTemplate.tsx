import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface OtpEmailTemplateProps {
  otp: string;
  purpose?: string;
}

export const OtpEmailTemplate = ({
  otp,
  purpose = 'email verification',
}: OtpEmailTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your verification code is: {otp}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Heading style={logoStyle}>UzaForms</Heading>
          </Section>

          <Hr style={divider} />

          {/* Content */}
          <Section style={contentSection}>
            <Heading style={titleStyle}>Verification Code</Heading>
            <Text style={paragraphStyle}>
              Please use the following verification code to complete your {purpose}:
            </Text>

            {/* OTP Display */}
            <Section style={otpContainer}>
              <Text style={otpCode}>{otp}</Text>
            </Section>

            <Text style={paragraphStyle}>
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </Text>

            <Text style={warningText}>
              For security reasons, never share this code with anyone.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footerSection}>
            <Text style={footerText}>
              This is an automated email from UzaForms. Please do not reply to this message.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} UzaForms. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OtpEmailTemplate;

const main = {
  backgroundColor: '#f8f9fa',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '0',
  width: '600px',
  maxWidth: '100%',
  backgroundColor: '#ffffff',
  borderRadius: '0',
};

const headerSection = {
  padding: '32px 40px 24px',
  backgroundColor: '#001A55',
  textAlign: 'center' as const,
};

const logoStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#ffffff',
  margin: '0',
  padding: '0',
};

const divider = {
  borderColor: '#e5e7eb',
  borderWidth: '1px',
  borderStyle: 'solid',
  margin: '0',
};

const contentSection = {
  padding: '40px 40px',
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 24px 0',
  lineHeight: '32px',
};

const paragraphStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px 0',
};

const otpContainer = {
  margin: '32px 0',
  padding: '24px',
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  border: '2px solid #e5e7eb',
  textAlign: 'center' as const,
};

const otpCode = {
  fontSize: '36px',
  fontWeight: '700',
  color: '#001A55',
  letterSpacing: '8px',
  margin: '0',
  fontFamily: 'monospace',
};

const warningText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#dc2626',
  margin: '24px 0 0 0',
  fontWeight: '500',
};

const footerSection = {
  padding: '24px 40px',
  backgroundColor: '#f9fafb',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6b7280',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

