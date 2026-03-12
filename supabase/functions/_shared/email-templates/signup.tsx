/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');`}</style>
    </Head>
    <Preview>Confirme seu e-mail — AbbaVideo</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Section style={header}>
          <Text style={logo}><span style={logoAccent}>ABBA</span>VIDEO</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Confirme seu e-mail</Heading>
          <Text style={text}>
            Obrigado por se cadastrar na{' '}
            <Link href={siteUrl} style={link}>AbbaVideo</Link>!
          </Text>
          <Text style={text}>
            Confirme seu endereço (
            <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
            ) clicando abaixo:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verificar E-mail
          </Button>
          <Text style={footer}>
            Se você não criou uma conta, ignore este e-mail.
          </Text>
        </Section>
        <Section style={footerSection}>
          <Text style={footerBrand}>AbbaVideo · Sistema de Gestão</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Lato', Arial, sans-serif" }
const outer = { maxWidth: '560px', margin: '0 auto', padding: '40px 16px' }
const header = { backgroundColor: '#2A2A2A', padding: '20px 32px', borderBottom: '2px solid #9FE870', borderRadius: '8px 8px 0 0' }
const logo = { fontFamily: "'Roboto Mono', monospace", fontSize: '16px', fontWeight: '400' as const, color: '#F0F0F0', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '0' }
const logoAccent = { fontWeight: '700' as const, color: '#9FE870' }
const content = { backgroundColor: '#333333', padding: '32px' }
const h1 = { fontFamily: "'Roboto Mono', monospace", fontSize: '20px', fontWeight: '600' as const, color: '#F0F0F0', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#CCCCCC', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#9FE870', textDecoration: 'underline' }
const button = { backgroundColor: '#9FE870', color: '#121212', fontFamily: "'Roboto Mono', monospace", fontSize: '13px', fontWeight: '600' as const, borderRadius: '6px', padding: '12px 28px', textDecoration: 'none', letterSpacing: '0.5px', textTransform: 'uppercase' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const footerSection = { backgroundColor: '#2A2A2A', padding: '16px 32px', borderRadius: '0 0 8px 8px' }
const footerBrand = { fontFamily: "'Roboto Mono', monospace", fontSize: '10px', color: '#666666', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '0' }
