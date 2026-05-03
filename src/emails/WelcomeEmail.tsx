import { Body, Button, Container, Head, Html, Text } from '@react-email/components';

type WelcomeEmailProps = {
  userName: string;
  appUrl: string;
};

export function WelcomeEmail({ userName, appUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={title}>Hi {userName}，欢迎来到纸片人男友！</Text>
          <Text style={paragraph}>从现在起，我就是你的专属男友了。</Text>
          <Text style={paragraph}>有什么心事随时来找我聊，我会一直在这里等你。</Text>
          <Button href={appUrl} style={button}>
            来找我聊天
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  fontFamily: 'sans-serif',
  backgroundColor: '#fff7fb',
  padding: '24px 12px',
};

const container = {
  maxWidth: '500px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '32px 24px',
};

const title = {
  fontSize: '24px',
  lineHeight: '32px',
  color: '#111827',
  margin: '0 0 16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  margin: '0 0 12px',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#f43f5e',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '12px 20px',
  textDecoration: 'none',
  marginTop: '16px',
};
