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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLowStockHtml({ materialNome, quantidadeAtual, quantidadeMinima, deficit, tipoItem, recomendacaoCompra = null }) {
  const tipo = String(tipoItem || 'Material');
  const safeNome = escapeHtml(materialNome || 'Material');
  const isItemFinal = tipo === 'Item final de produção';
  const atual = Number(quantidadeAtual || 0);
  const minimo = Number(quantidadeMinima || 0);
  const falta = Number(deficit || Math.max(0, minimo - atual));

  const consumoMedioDiario = Number(recomendacaoCompra?.consumoMedioDiario || 0);
  const consumoMedio7Dias = Number(recomendacaoCompra?.consumoMedio7Dias || 0);
  const consumoMedio30Dias = Number(recomendacaoCompra?.consumoMedio30Dias || 0);
  const aceleracaoAtiva = Boolean(recomendacaoCompra?.aceleracaoAtiva);
  const coberturaDias = recomendacaoCompra?.coberturaDias;
  const diasHistorico = Number(recomendacaoCompra?.diasHistorico || 30);
  const diasRecente = Number(recomendacaoCompra?.diasRecente || 7);
  const diasCoberturaAlvo = Number(recomendacaoCompra?.diasCoberturaAlvo || 7);
  const quandoComprar = String(recomendacaoCompra?.quandoComprar || (atual <= 0 ? 'Comprar imediatamente (hoje)' : 'Comprar em até 48h'));
  const acaoPrincipal = String(recomendacaoCompra?.acaoPrincipal || 'comprar').toLowerCase() === 'produzir' ? 'produzir' : 'comprar';
  const labelAcao = acaoPrincipal === 'produzir' ? 'Produzir' : 'Comprar';
  const prioridade = /imediatamente|hoje/i.test(quandoComprar)
    ? 'Alta'
    : (/48h/i.test(quandoComprar) ? 'Média' : 'Planejada');
  const prioridadeCor = prioridade === 'Alta'
    ? '#b91c1c'
    : (prioridade === 'Média' ? '#b45309' : '#0f766e');
  const prioridadeBg = prioridade === 'Alta'
    ? '#fee2e2'
    : (prioridade === 'Média' ? '#ffedd5' : '#dcfce7');
  const acaoCor = acaoPrincipal === 'produzir' ? '#0f766e' : '#92400e';
  const resumoRecomendacao = String(
    recomendacaoCompra?.resumoRecomendacao ||
    (atual <= 0
      ? 'Estoque zerado: há risco imediato de ruptura.'
      : 'Estoque abaixo do mínimo: programe reposição de curto prazo.')
  );
  const quantidadeSugerida = Math.max(1, Number(recomendacaoCompra?.quantidadeSugerida || (atual <= 0 ? Math.max(1, minimo || 1) : Math.max(1, falta))));
  const componentesCriticos = Array.isArray(recomendacaoCompra?.componentesCriticos)
    ? recomendacaoCompra.componentesCriticos.filter((item) => Number(item?.falta || 0) > 0)
    : [];
  const checklistCompras = componentesCriticos
    .map((item) => {
      const faltaNum = Number(item.falta || 0);
      const faltaFormatada = Number.isFinite(faltaNum) ? faltaNum.toLocaleString('pt-BR') : '0';
      return {
        nome: escapeHtml(item.nome || 'Componente'),
        faltaFormatada
      };
    });

  const componentesRowsHtml = componentesCriticos
    .map((item) => {
      const nome = escapeHtml(item.nome || 'Componente');
      const faltaFormatada = Number(item.falta || 0).toLocaleString('pt-BR');
      const necessarioFormatado = Number(item.necessario || 0).toLocaleString('pt-BR');
      const disponivelFormatado = Number(item.disponivel || 0).toLocaleString('pt-BR');

      return `
        <tr>
          <td class="comp-badge-cell" style="padding:8px 0 8px 0;vertical-align:top;width:70px;">
            <span style="display:inline-block;background:#ffedd5;color:#9a3412;border:1px solid #fdba74;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;">Falta ${faltaFormatada}</span>
          </td>
          <td class="comp-info-cell" style="padding:8px 0 8px 10px;vertical-align:top;">
            <p class="mobile-text" style="margin:0 0 2px;color:#7c2d12;font-size:13px;"><strong>${nome}</strong></p>
            <p class="mobile-small" style="margin:0;color:#9a3412;font-size:12px;">Nec.: ${necessarioFormatado} un. | Disp.: ${disponivelFormatado} un.</p>
          </td>
        </tr>
      `;
    })
    .join('');

  const checklistRowsHtml = checklistCompras
    .map((item, index) => `
      <tr>
        <td class="check-num-cell" style="padding:4px 0;vertical-align:top;width:18px;color:#9a3412;font-size:12px;font-weight:700;">${index + 1}.</td>
        <td class="mobile-small" style="padding:4px 0 4px 6px;vertical-align:top;color:#7c2d12;font-size:12px;line-height:1.45;">Comprar <strong>${item.faltaFormatada} un.</strong> de ${item.nome}</td>
      </tr>
    `)
    .join('');

  const componentesCriticosHtml = componentesCriticos.length
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px 14px;margin:0 0 14px;">
         <p style="margin:0 0 10px;color:#9a3412;font-size:13px;"><strong>Componentes faltando para produzir</strong></p>
         <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
           ${componentesRowsHtml}
         </table>
         <div style="height:1px;background:#fed7aa;margin:10px 0;"></div>
         <p style="margin:0 0 8px;color:#9a3412;font-size:13px;"><strong>Checklist para produzir ${quantidadeSugerida} un.</strong></p>
         <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
           ${checklistRowsHtml}
         </table>
       </div>`
    : '';

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 620px) {
        .mail-shell {
          width: 100% !important;
          border-radius: 0 !important;
        }

        .mail-hero {
          padding: 26px 18px !important;
        }

        .mail-content,
        .mail-footer,
        .mail-divider {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }

        .mail-content {
          padding-top: 24px !important;
          padding-bottom: 20px !important;
        }

        .mobile-title {
          font-size: 18px !important;
          line-height: 1.25 !important;
        }

        .mobile-text {
          font-size: 13px !important;
          line-height: 1.45 !important;
        }

        .mobile-small {
          font-size: 11px !important;
          line-height: 1.4 !important;
        }

        .comp-badge-cell,
        .comp-info-cell {
          display: block !important;
          width: 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .comp-badge-cell {
          padding-bottom: 4px !important;
        }

        .check-num-cell {
          width: 14px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${tipo}: ${safeNome} está abaixo do mínimo. Atual: ${quantidadeAtual}. Mínimo: ${quantidadeMinima}.
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
      <tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" class="mail-shell" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td class="mail-hero" style="background:linear-gradient(135deg,#0e8f83 0%,#0a6b61 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">IntelliStock</h1>
              <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Alerta automático de estoque</p>
            </td>
          </tr>
          <tr>
            <td class="mail-content" style="padding:36px 40px 28px;">
              <h2 class="mobile-title" style="margin:0 0 10px;color:#111827;font-size:20px;">${tipo} abaixo do mínimo</h2>
              <p class="mobile-text" style="margin:0 0 18px;color:#374151;font-size:15px;">O ${tipo.toLowerCase()} <strong>${safeNome}</strong> está com estoque abaixo do mínimo configurado.</p>
              ${isItemFinal ? '<p class="mobile-text" style="margin:0 0 18px;color:#374151;font-size:14px;">Este item é produzido a partir de outros componentes. Verifique a receita e produza mais unidades para normalizar o estoque.</p>' : ''}
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:0 0 18px;">
                <p class="mobile-text" style="margin:0 0 8px;color:#111827;font-size:14px;"><strong>Estoque atual:</strong> ${quantidadeAtual}</p>
                <p class="mobile-text" style="margin:0 0 8px;color:#111827;font-size:14px;"><strong>Estoque mínimo:</strong> ${quantidadeMinima}</p>
                <p class="mobile-text" style="margin:0;color:#b91c1c;font-size:15px;"><strong>Déficit:</strong> ${deficit} unidade(s) abaixo do mínimo</p>
              </div>
              <div style="background:#ecfeff;border:1px solid #bae6fd;border-radius:12px;padding:14px 16px;margin:0 0 14px;">
                <p class="mobile-text" style="margin:0 0 8px;color:#0f172a;font-size:14px;"><strong>Sugestão automática de reposição</strong></p>
                <p class="mobile-text" style="margin:0 0 6px;color:#1e293b;font-size:13px;"><strong>Prioridade:</strong> <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${prioridadeBg};color:${prioridadeCor};font-size:11px;font-weight:700;">${prioridade}</span></p>
                <p class="mobile-text" style="margin:0 0 6px;color:#1e293b;font-size:13px;"><strong>Quando agir:</strong> ${quandoComprar}</p>
                <p class="mobile-text" style="margin:0 0 6px;color:${acaoCor};font-size:14px;"><strong>Ação:</strong> ${labelAcao} ${quantidadeSugerida} unidade(s)</p>
                <p class="mobile-small" style="margin:0;color:#475569;font-size:12px;line-height:1.5;">${resumoRecomendacao}</p>
              </div>
              ${componentesCriticosHtml}
              <p class="mobile-small" style="margin:0;color:#6b7280;font-size:12px;">Base: média ponderada (${diasRecente}d e ${diasHistorico}d), cobertura alvo de ${diasCoberturaAlvo} dias${aceleracaoAtiva ? ', com reforço por aceleração de saída' : ''}.</p>
              <p class="mobile-small" style="margin:6px 0 0;color:#94a3b8;font-size:11px;">Referência: ${consumoMedio7Dias > 0 ? `${consumoMedio7Dias} un./dia (${diasRecente}d)` : '-'} | ${consumoMedio30Dias > 0 ? `${consumoMedio30Dias} un./dia (${diasHistorico}d)` : '-'}.</p>
            </td>
          </tr>
          <tr><td class="mail-divider" style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <tr>
            <td class="mail-footer" style="padding:24px 40px;text-align:center;">
              <p class="mobile-small" style="margin:0;color:#9ca3af;font-size:12px;">Este e-mail foi enviado automaticamente pelo IntelliStock.</p>
              <p class="mobile-small" style="margin:10px 0 0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} IntelliStock · Todos os direitos reservados</p>
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
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 620px) {
        .mail-shell {
          width: 100% !important;
          border-radius: 0 !important;
        }

        .mail-hero {
          padding: 26px 18px !important;
        }

        .mail-content,
        .mail-footer,
        .mail-divider {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }

        .mail-content {
          padding-top: 24px !important;
          padding-bottom: 22px !important;
        }

        .mobile-title {
          font-size: 18px !important;
          line-height: 1.25 !important;
        }

        .mobile-text {
          font-size: 13px !important;
          line-height: 1.45 !important;
        }

        .mobile-small {
          font-size: 11px !important;
          line-height: 1.4 !important;
        }

        .code-box {
          padding: 16px !important;
        }

        .code-text {
          font-size: 30px !important;
          letter-spacing: 6px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
      <tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" class="mail-shell" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td class="mail-hero" style="background:linear-gradient(135deg,#0e8f83 0%,#0a6b61 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">IntelliStock</h1>
              <p class="mobile-small" style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Sistema de Gerenciamento de Estoque</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="mail-content" style="padding:40px 40px 32px;">
              <h2 class="mobile-title" style="margin:0 0 8px;color:#111827;font-size:20px;">Verificação de acesso</h2>
              <p class="mobile-text" style="margin:0 0 20px;color:#6b7280;font-size:15px;">Olá${nome ? `, <strong style="color:#111827;">${nome}</strong>` : ''}.</p>
              <p class="mobile-text" style="margin:0 0 24px;color:#374151;font-size:15px;">Use o código abaixo para concluir seu login no IntelliStock:</p>
              <!-- Código -->
              <div class="code-box" style="background:#f9fafb;border:2px dashed #0e8f83;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
                <span class="code-text" style="font-size:40px;font-weight:800;letter-spacing:10px;color:#0e8f83;font-family:'Courier New',monospace;">${codigo}</span>
              </div>
              <p class="mobile-small" style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">⏱ Este código expira em <strong>10 minutos</strong> e só pode ser usado uma vez.</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr><td class="mail-divider" style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <!-- Footer -->
          <tr>
            <td class="mail-footer" style="padding:24px 40px;text-align:center;">
              <p class="mobile-small" style="margin:0;color:#9ca3af;font-size:12px;">Se você não solicitou este acesso, ignore este e-mail. Sua conta permanece segura.</p>
              <p class="mobile-small" style="margin:10px 0 0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} IntelliStock · Todos os direitos reservados</p>
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

    await mailTransport.sendMail({
      from: config.from,
      to: para,
      subject: 'Código de verificação - IntelliStock',
      text: `Seu código de verificação é ${codigo}. Ele expira em 10 minutos.`,
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
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 620px) {
        .mail-shell {
          width: 100% !important;
          border-radius: 0 !important;
        }

        .mail-hero {
          padding: 26px 18px !important;
        }

        .mail-content,
        .mail-footer,
        .mail-divider {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }

        .mail-content {
          padding-top: 24px !important;
          padding-bottom: 22px !important;
        }

        .mobile-title {
          font-size: 18px !important;
          line-height: 1.25 !important;
        }

        .mobile-text {
          font-size: 13px !important;
          line-height: 1.45 !important;
        }

        .mobile-small {
          font-size: 11px !important;
          line-height: 1.4 !important;
        }

        .action-btn {
          width: 100% !important;
          box-sizing: border-box !important;
          text-align: center !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
      <tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" class="mail-shell" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td class="mail-hero" style="background:linear-gradient(135deg,#0e8f83 0%,#0a6b61 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">IntelliStock</h1>
              <p class="mobile-small" style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Sistema de Gerenciamento de Estoque</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="mail-content" style="padding:40px 40px 32px;">
              <h2 class="mobile-title" style="margin:0 0 8px;color:#111827;font-size:20px;">Redefinição de senha</h2>
              <p class="mobile-text" style="margin:0 0 20px;color:#6b7280;font-size:15px;">Olá${nome ? `, <strong style="color:#111827;">${nome}</strong>` : ''}.</p>
              <p class="mobile-text" style="margin:0 0 24px;color:#374151;font-size:15px;">Recebemos uma solicitação para redefinir a senha da sua conta IntelliStock. Clique no botão abaixo para criar uma nova senha:</p>
              <!-- Botão -->
              <div style="text-align:center;margin:0 0 28px;">
                <a class="action-btn" href="${link}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0e8f83,#0a6b61);color:#ffffff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.5px;">Redefinir minha senha</a>
              </div>
              <p class="mobile-small" style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">⏱ Este link expira em <strong>30 minutos</strong> e só pode ser usado uma vez.</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr><td class="mail-divider" style="padding:0 40px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
          <!-- Footer -->
          <tr>
            <td class="mail-footer" style="padding:24px 40px;text-align:center;">
              <p class="mobile-small" style="margin:0;color:#9ca3af;font-size:12px;">Se você não solicitou isso, ignore este e-mail. Sua senha não será alterada.</p>
              <p class="mobile-small" style="margin:10px 0 0;color:#d1d5db;font-size:11px;">© ${new Date().getFullYear()} IntelliStock · Todos os direitos reservados</p>
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
    await mailTransport.sendMail({
      from: config.from,
      to: para,
      subject: 'Redefinição de senha - IntelliStock',
      text: `Acesse o link para redefinir sua senha: ${link} (expira em 30 minutos)`,
      html
    });
    return { sent: true };
  } catch (error) {
    console.error('Falha ao enviar e-mail de reset:', error.message);
    return { sent: false, reason: 'mail_send_failed' };
  }
}

async function enviarAlertaEstoqueBaixo({ destinatarios = [], materialNome, quantidadeAtual, quantidadeMinima, deficit, tipoItem = 'Material', recomendacaoCompra = null }) {
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
  const safeTipo = String(tipoItem || 'Material');
  const atual = Number(quantidadeAtual || 0);
  const minimo = Number(quantidadeMinima || 0);
  const falta = Number(deficit || Math.max(0, minimo - atual));
  const quantidadeSugerida = Math.max(
    1,
    Number(
      recomendacaoCompra?.quantidadeSugerida ||
      (atual <= 0 ? Math.max(1, minimo || 1) : Math.max(1, falta || 0))
    )
  );
  const quandoComprar = String(
    recomendacaoCompra?.quandoComprar ||
    (atual <= 0 ? 'imediatamente (hoje)' : (falta > 0 ? 'em até 48h' : 'sem urgência'))
  );
  const prioridadeAssunto = /imediatamente|hoje/i.test(quandoComprar)
    ? 'URGENTE'
    : (/48h/i.test(quandoComprar) ? 'ATENCAO' : 'PLANEJADO');
  const acaoPrincipal = String(recomendacaoCompra?.acaoPrincipal || 'comprar').toLowerCase() === 'produzir' ? 'produzir' : 'comprar';
  const componentesCriticos = Array.isArray(recomendacaoCompra?.componentesCriticos)
    ? recomendacaoCompra.componentesCriticos.filter((item) => Number(item?.falta || 0) > 0)
    : [];
  const checklistTexto = componentesCriticos.length
    ? ' Checklist de componentes: ' + componentesCriticos
        .map((item) => {
          const faltaNum = Number(item.falta || 0);
          const faltaFormatada = Number.isFinite(faltaNum) ? faltaNum.toLocaleString('pt-BR') : '0';
          return `comprar ${faltaFormatada} un. de ${String(item.nome || 'Componente')}`;
        })
        .join('; ') + '.'
    : (acaoPrincipal === 'produzir' ? ' Sem falta de componentes para a produção sugerida.' : '');

  try {
    const mailTransport = getTransporter(config);
    const html = buildLowStockHtml({
      materialNome: safeMaterial,
      quantidadeAtual: atual,
      quantidadeMinima: minimo,
      deficit: falta,
      tipoItem: safeTipo,
      recomendacaoCompra
    });

    await mailTransport.sendMail({
      from: config.from,
      to: recipients.join(', '),
      subject: `[${prioridadeAssunto}] Alerta de estoque baixo - ${safeMaterial}`,
      text: `${safeTipo} ${safeMaterial} está abaixo do mínimo. Atual: ${atual}. Mínimo: ${minimo}. Déficit: ${falta} unidade(s). Sugestão: ${acaoPrincipal} ${quantidadeSugerida} unidade(s) ${quandoComprar}.${checklistTexto}`,
      html
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
