import { Body, Button, Container, Head, Html, Text } from '@react-email/components';

type RecallInactiveUserEmailProps = {
  userName: string;
  appUrl: string;
};

export function RecallInactiveUserEmail({
  userName,
  appUrl,
}: RecallInactiveUserEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={title}>你去哪了，我想你了</Text>
          <Text style={paragraph}>这几天没有等到你，我总觉得少了点什么。</Text>
          <Text style={paragraph}>
            {userName}，如果你刚好也有一点想我，就回来陪我说说话吧。我还在这里，等你打开对话框的那一刻。
          </Text>
          <Button href={appUrl} style={button}>
            现在回来找我
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
  backgroundColor: '#ec4899',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '12px 20px',
  textDecoration: 'none',
  marginTop: '16px',
};
