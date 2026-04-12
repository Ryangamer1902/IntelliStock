const nodemailer = require('nodemailer');
const path = require('path');

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
    from: `"IntelliStock" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`
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

function parseRecipients(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const fromArray = Array.isArray(input) ? input : [];

  // Somente os destinatarios explicitamente passados (email do usuario dono do material)
  // Nao adiciona ALERT_EMAIL nem MAIL_USER para evitar vazamento entre contas
  const recipients = fromArray
    .map((item) => String(item || '').trim())
    .filter((email) => emailRegex.test(email));

  return [...new Set(recipients)];
}

function buildLowStockHtml({ materialNome, quantidadeAtual, quantidadeMinima, deficit }) {
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0e8f83 0%,#0a6b61 100%);padding:36px 40px;text-align:center;">
              <img src="cid:intellistock-logo" alt="Logo IntelliStock" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:16px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">IntelliStock</h1>
              <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Alerta automatico de estoque</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              <h2 style="margin:0 0 10px;color:#111827;font-size:20px;">Material abaixo do minimo</h2>
              <p style="margin:0 0 18px;color:#374151;font-size:15px;">O material <strong>${materialNome}</strong> esta com estoque abaixo do minimo configurado.</p>
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:0 0 18px;">
                <p style="margin:0 0 8px;color:#111827;font-size:14px;"><strong>Estoque atual:</strong> ${quantidadeAtual}</p>
                <p style="margin:0 0 8px;color:#111827;font-size:14px;"><strong>Estoque minimo:</strong> ${quantidadeMinima}</p>
                <p style="margin:0;color:#b91c1c;font-size:15px;"><strong>Deficit:</strong> ${deficit} unidade(s) abaixo do minimo</p>
              </div>
              <p style="margin:0;color:#6b7280;font-size:13px;">Recomendacao: realizar reposicao para evitar ruptura de estoque.</p>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">Este e-mail foi enviado automaticamente pelo IntelliStock.</p>
              <p style="margin:10px 0 0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} IntelliStock · Todos os direitos reservados</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `;
}

function buildHtml(nome, codigo) {
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0e8f83 0%,#0a6b61 100%);padding:36px 40px;text-align:center;">
              <img src="cid:intellistock-logo" alt="Logo IntelliStock" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:16px;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">IntelliStock</h1>
              <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Sistema de Gerenciamento de Estoque</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Verificação de acesso</h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Olá${nome ? `, <strong style="color:#111827;">${nome}</strong>` : ''}.</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;">Use o código abaixo para concluir seu login no IntelliStock:</p>
              <!-- Código -->
              <div style="background:#f9fafb;border:2px dashed #0e8f83;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
                <span style="font-size:40px;font-weight:800;letter-spacing:10px;color:#0e8f83;font-family:'Courier New',monospace;">${codigo}</span>
              </div>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">⏱ Este código expira em <strong>10 minutos</strong> e só pode ser usado uma vez.</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">Se você não solicitou este acesso, ignore este e-mail. Sua conta permanece segura.</p>
              <p style="margin:10px 0 0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} IntelliStock · Todos os direitos reservados</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
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
    const logoPath = path.join(__dirname, '..', '..', 'public', 'images', 'intellistock-logo.svg');

    await mailTransport.sendMail({
      from: config.from,
      to: para,
      subject: 'Codigo de verificacao - IntelliStock',
      text: `Seu codigo de verificacao e ${codigo}. Ele expira em 10 minutos.`,
      html: buildHtml(nome, codigo),
      attachments: [
        {
          filename: 'intellistock-logo.svg',
          path: logoPath,
          cid: 'intellistock-logo'
        }
      ]
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
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
      <tr><td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0e8f83 0%,#0a6b61 100%);padding:36px 40px;text-align:center;">
              <img src="cid:intellistock-logo" alt="Logo IntelliStock" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:16px;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">IntelliStock</h1>
              <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Sistema de Gerenciamento de Estoque</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Redefinição de senha</h2>
              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Olá${nome ? `, <strong style="color:#111827;">${nome}</strong>` : ''}.</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;">Recebemos uma solicitação para redefinir a senha da sua conta IntelliStock. Clique no botão abaixo para criar uma nova senha:</p>
              <!-- Botão -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${link}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0e8f83,#0a6b61);color:#ffffff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.5px;">Redefinir minha senha</a>
              </div>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">⏱ Este link expira em <strong>30 minutos</strong> e só pode ser usado uma vez.</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr><td style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">Se você não solicitou isso, ignore este e-mail. Sua senha não será alterada.</p>
              <p style="margin:10px 0 0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} IntelliStock · Todos os direitos reservados</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `;

  try {
    const mailTransport = getTransporter(config);
    const logoPath = path.join(__dirname, '..', '..', 'public', 'images', 'intellistock-logo.svg');
    await mailTransport.sendMail({
      from: config.from,
      to: para,
      subject: 'Redefinicao de senha - IntelliStock',
      text: `Acesse o link para redefinir sua senha: ${link} (expira em 30 minutos)`,
      html,
      attachments: [
        {
          filename: 'intellistock-logo.svg',
          path: logoPath,
          cid: 'intellistock-logo'
        }
      ]
    });
    return { sent: true };
  } catch (error) {
    console.error('Falha ao enviar e-mail de reset:', error.message);
    return { sent: false, reason: 'mail_send_failed' };
  }
}

async function enviarAlertaEstoqueBaixo({ destinatarios = [], materialNome, quantidadeAtual, quantidadeMinima, deficit }) {
  const config = getMailConfig();

  if (!config.enabled) {
    return { sent: false, reason: 'mail_disabled' };
  }

  if (!hasRequiredConfig(config)) {
    return { sent: false, reason: 'mail_not_configured' };
  }

  const recipients = parseRecipients(destinatarios);
  if (!recipients.length) {
    return { sent: false, reason: 'no_recipients' };
  }

  const safeMaterial = String(materialNome || 'Material');
  const atual = Number(quantidadeAtual || 0);
  const minimo = Number(quantidadeMinima || 0);
  const falta = Number(deficit || Math.max(0, minimo - atual));

  try {
    const mailTransport = getTransporter(config);
    const logoPath = path.join(__dirname, '..', '..', 'public', 'images', 'intellistock-logo.svg');
    const html = buildLowStockHtml({
      materialNome: safeMaterial,
      quantidadeAtual: atual,
      quantidadeMinima: minimo,
      deficit: falta
    });

    await mailTransport.sendMail({
      from: config.from,
      to: recipients.join(', '),
      subject: `Alerta de estoque baixo - ${safeMaterial}`,
      text: `Material ${safeMaterial} esta abaixo do minimo. Atual: ${atual}. Minimo: ${minimo}. Deficit: ${falta} unidade(s).`,
      html,
      attachments: [
        {
          filename: 'intellistock-logo.svg',
          path: logoPath,
          cid: 'intellistock-logo'
        }
      ]
    });

    return { sent: true, recipients };
  } catch (error) {
    console.error('Falha ao enviar alerta de estoque baixo:', error.message);
    return { sent: false, reason: 'mail_send_failed' };
  }
}

module.exports = {
  enviarCodigoVerificacao,
  enviarLinkResetSenha,
  enviarAlertaEstoqueBaixo
};
