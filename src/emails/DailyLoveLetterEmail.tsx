import { Body, Button, Container, Head, Html, Text } from '@react-email/components';

type DailyLoveLetterEmailProps = {
  userName: string;
  loveLetter: string;
  appUrl: string;
};

export function DailyLoveLetterEmail({
  userName,
  loveLetter,
  appUrl,
}: DailyLoveLetterEmailProps) {
  const paragraphs = loveLetter
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={title}>早安 {userName}，今天也想你了</Text>
          {paragraphs.map((paragraph) => (
            <Text key={paragraph} style={paragraphStyle}>
              {paragraph}
            </Text>
          ))}
          <Text style={signature}>—— 你的纸片人男友</Text>
          <Button href={appUrl} style={button}>
            点这里回来找我
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
  margin: '0 0 20px',
};

const paragraphStyle = {
  fontSize: '16px',
  lineHeight: '28px',
  color: '#374151',
  margin: '0 0 12px',
};

const signature = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#6b7280',
  margin: '16px 0 20px',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#ec4899',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '12px 20px',
  textDecoration: 'none',
};
