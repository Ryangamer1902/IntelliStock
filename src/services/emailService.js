const nodemailer = require('nodemailer');

let transporter = null;

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).trim().toLowerCase() === 'true';
}

function getMailConfig() {
  return {
    enabled: toBoolean(process.env.MAIL_ENABLED, false),
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT || 587),
    secure: toBoolean(process.env.MAIL_SECURE, false),
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || process.env.MAIL_USER
  };
}

function hasRequiredConfig(config) {
  return Boolean(
    config.host &&
    config.port &&
    config.user &&
    config.pass &&
    config.from
  );
}

function getTransporter(config) {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  return transporter;
}

function buildHtml(nome, codigo) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">Verificacao de acesso</h2>
      <p>Olá${nome ? `, ${nome}` : ''}.</p>
      <p>Use o codigo abaixo para concluir seu login no IntelliStock:</p>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; margin: 18px 0; color: #111827;">
        ${codigo}
      </div>
      <p>Este codigo expira em 10 minutos e so pode ser usado uma vez.</p>
      <p style="font-size: 12px; color: #6b7280;">Se voce nao solicitou este acesso, ignore este e-mail.</p>
    </div>
  `;
}

async function enviarCodigoVerificacao({ para, nome, codigo }) {
  const config = getMailConfig();

  if (!config.enabled) {
    return { sent: false, reason: 'mail_disabled' };
  }

  if (!hasRequiredConfig(config)) {
    return { sent: false, reason: 'mail_not_configured' };
  }

  try {
    const mailTransport = getTransporter(config);

    await mailTransport.sendMail({
      from: config.from,
      to: para,
      subject: 'Codigo de verificacao - IntelliStock',
      text: `Seu codigo de verificacao e ${codigo}. Ele expira em 10 minutos.`,
      html: buildHtml(nome, codigo)
    });

    return { sent: true };
  } catch (error) {
    console.error('Falha ao enviar e-mail 2FA:', error.message);
    return { sent: false, reason: 'mail_send_failed' };
  }
}

async function enviarLinkResetSenha({ para, nome, link }) {
  const config = getMailConfig();

  if (!config.enabled) {
    return { sent: false, reason: 'mail_disabled' };
  }

  if (!hasRequiredConfig(config)) {
    return { sent: false, reason: 'mail_not_configured' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">Redefinicao de senha</h2>
      <p>Ola${nome ? `, ${nome}` : ''}.</p>
      <p>Recebemos uma solicitacao para redefinir a senha da sua conta IntelliStock.</p>
      <p>Clique no botao abaixo para criar uma nova senha:</p>
      <a href="${link}" style="display:inline-block;margin:18px 0;padding:12px 24px;background:#0e8f83;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Redefinir minha senha</a>
      <p>Este link expira em 30 minutos e so pode ser usado uma vez.</p>
      <p style="font-size:12px;color:#6b7280;">Se voce nao solicitou isso, ignore este e-mail. Sua senha nao sera alterada.</p>
    </div>
  `;

  try {
    const mailTransport = getTransporter(config);
    await mailTransport.sendMail({
      from: config.from,
      to: para,
      subject: 'Redefinicao de senha - IntelliStock',
      text: `Acesse o link para redefinir sua senha: ${link} (expira em 30 minutos)`,
      html
    });
    return { sent: true };
  } catch (error) {
    console.error('Falha ao enviar e-mail de reset:', error.message);
    return { sent: false, reason: 'mail_send_failed' };
  }
}

module.exports = {
  enviarCodigoVerificacao,
  enviarLinkResetSenha
};
