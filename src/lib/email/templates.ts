/**
 * Production White-Labeled Responsive Email Templates (Phase 15)
 * Cross-client compatible with Gmail, Apple Mail, Outlook, iOS & Android.
 */

export interface EmailBrandingContext {
  studioName: string;
  logoUrl?: string;
  accentColor?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
}

function baseEmailLayout(content: string, branding: EmailBrandingContext): string {
  const accent = branding.accentColor || "#D4AF37";
  const studioName = branding.studioName || "DR Films Wedding Cinema";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${studioName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; }
    td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; vertical-align: top; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background-color: #121216; border-radius: 16px; border: 1px solid #23232A; overflow: hidden; }
    .header { padding: 32px 24px; text-align: center; border-bottom: 1px solid #1E1E26; background: linear-gradient(180deg, #181820 0%, #121216 100%); }
    .body-content { padding: 32px 28px; color: #E2E2E8; line-height: 1.6; }
    .btn { display: inline-block; background-color: ${accent}; color: #0A0A0C !important; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-size: 15px; text-align: center; letter-spacing: 0.5px; margin: 20px 0; }
    .access-box { background-color: #181822; border: 1px dashed ${accent}66; border-radius: 12px; padding: 16px 20px; text-align: center; margin: 24px 0; }
    .access-code { font-family: 'Courier New', Courier, monospace; font-size: 24px; font-weight: 800; letter-spacing: 4px; color: ${accent}; margin: 6px 0; }
    .footer { padding: 24px; text-align: center; font-size: 13px; color: #71717A; border-top: 1px solid #1E1E26; }
    .footer a { color: #A1A1AA; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        ${
          branding.logoUrl
            ? `<img src="${branding.logoUrl}" alt="${studioName}" style="max-height: 52px; max-width: 220px; margin-bottom: 12px;" />`
            : `<h1 style="margin: 0; color: ${accent}; font-size: 22px; letter-spacing: 1px; text-transform: uppercase;">${studioName}</h1>`
        }
      </div>
      <div class="body-content">
        ${content}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;"><strong>${studioName}</strong></p>
        ${branding.website ? `<p style="margin: 4px 0;"><a href="${branding.website}">${branding.website}</a></p>` : ""}
        ${branding.email || branding.phone ? `<p style="margin: 4px 0;">${branding.email || ""} ${branding.phone ? `• ${branding.phone}` : ""}</p>` : ""}
        <p style="margin: 12px 0 0 0; font-size: 11px; color: #52525B;">Delivered securely by ${studioName} Wedding Cinema.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── 1. Gallery Published Email ────────────────────────────────────────────────

export function renderGalleryPublishedEmail(params: {
  coupleName: string;
  weddingDate: string;
  galleryUrl: string;
  accessCode?: string;
  branding: EmailBrandingContext;
  customMessage?: string;
}): { html: string; text: string; subject: string } {
  const { coupleName, weddingDate, galleryUrl, accessCode, branding, customMessage } = params;
  const studioName = branding.studioName || "Your Wedding Cinema";
  const subject = `✨ Your Wedding Video & Photo Gallery is Ready! | ${coupleName}`;

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">Dear ${coupleName},</h2>
    <p style="font-size: 16px; color: #D4D4D8;">
      ${customMessage || `We are overjoyed to present your private cinematic wedding gallery from your special celebration on <strong>${weddingDate}</strong>.`}
    </p>
    <p style="color: #A1A1AA;">
      Relive every heartfelt smile, emotional vow, and joyful celebration in 4K resolution on any device.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${galleryUrl}" class="btn" target="_blank">Open Your Wedding Gallery</a>
    </div>

    ${
      accessCode
        ? `<div class="access-box">
             <div style="font-size: 12px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px;">Your Private Access Code</div>
             <div class="access-code">${accessCode}</div>
             <div style="font-size: 12px; color: #71717A;">Enter this code when opening your gallery</div>
           </div>`
        : ""
    }

    <p style="font-size: 13px; color: #71717A; margin-top: 24px;">
      If the button above does not work, copy and paste this link into your web browser:<br/>
      <a href="${galleryUrl}" style="color: #A1A1AA; word-break: break-all;">${galleryUrl}</a>
    </p>
  `;

  const text = `
Dear ${coupleName},

Your private wedding video and photo gallery from ${weddingDate} is ready!

Open your gallery here:
${galleryUrl}

${accessCode ? `Access Code: ${accessCode}\n` : ""}
With warmest regards,
${studioName}
${branding.website || ""}
  `.trim();

  return {
    subject,
    html: baseEmailLayout(htmlContent, branding),
    text,
  };
}

// ── 2. Selection Submitted Photographer Email ─────────────────────────────────

export function renderSelectionSubmittedPhotographerEmail(params: {
  coupleName: string;
  clientName?: string;
  selectedCount: number;
  submittedAt: string;
  dashboardUrl: string;
  branding: EmailBrandingContext;
  notes?: string;
}): { html: string; text: string; subject: string } {
  const { coupleName, clientName, selectedCount, submittedAt, dashboardUrl, branding, notes } = params;
  const subject = `📸 Album Selection Submitted: ${coupleName} (${selectedCount} photos)`;

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">New Photo Selection Received!</h2>
    <p style="font-size: 15px; color: #D4D4D8;">
      Your client <strong>${clientName || coupleName}</strong> has completed and submitted their wedding album photo selection for <strong>${coupleName}</strong>.
    </p>

    <div style="background-color: #181822; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #272730;">
      <div style="margin-bottom: 8px;"><strong>Selected Photos:</strong> <span style="color: #D4AF37; font-weight: bold; font-size: 18px;">${selectedCount}</span></div>
      <div style="margin-bottom: 8px;"><strong>Submitted At:</strong> ${new Date(submittedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</div>
      <div style="margin-bottom: 8px;"><strong>Project:</strong> ${coupleName}</div>
      ${notes ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #33333E; color: #E2E2E8;"><strong>Client Notes:</strong><br/><em style="color: #A1A1AA;">"${notes}"</em></div>` : ""}
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardUrl}" class="btn" target="_blank">Review Album Selection</a>
    </div>
  `;

  const text = `
New Photo Selection Received!

Couple: ${coupleName}
Client: ${clientName || coupleName}
Selected Count: ${selectedCount} photos
Submitted At: ${submittedAt}
${notes ? `Client Notes: "${notes}"\n` : ""}
Review the selection in your dashboard:
${dashboardUrl}
  `.trim();

  return {
    subject,
    html: baseEmailLayout(htmlContent, branding),
    text,
  };
}


// ── 3. Selection Confirmation Client Email ───────────────────────────────────

export function renderSelectionConfirmationClientEmail(params: {
  coupleName: string;
  selectedCount: number;
  branding: EmailBrandingContext;
  galleryUrl?: string;
}): { html: string; text: string; subject: string } {
  const { coupleName, selectedCount, branding, galleryUrl } = params;
  const studioName = branding.studioName || "Your Photography Studio";
  const subject = `✓ Photo Selection Confirmed | ${coupleName}`;

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">Selection Successfully Received!</h2>
    <p style="font-size: 15px; color: #D4D4D8;">
      Dear ${coupleName}, thank you for submitting your photo selection! We have received your choices and our studio team has been notified.
    </p>

    <div class="access-box">
      <div style="font-size: 13px; color: #A1A1AA;">Photos Selected for Album</div>
      <div class="access-code">${selectedCount}</div>
      <div style="font-size: 12px; color: #71717A;">Status: Submitted to Studio</div>
    </div>

    ${
      galleryUrl
        ? `<div style="text-align: center; margin: 28px 0;">
             <a href="${galleryUrl}" class="btn" target="_blank">View Your Gallery</a>
           </div>`
        : ""
    }

    <p style="color: #A1A1AA; font-size: 14px;">
      Our cinema & design team will now begin retouching and preparing your personalized album layout. If you need to make any adjustments, please contact ${studioName} directly.
    </p>
  `;

  const text = `
Dear ${coupleName},

Thank you for submitting your album photo selection! We have safely received your ${selectedCount} selected photos.

Our team is now preparing your album design.${galleryUrl ? `\n\nView gallery: ${galleryUrl}` : ""}

With best wishes,
${studioName}
  `.trim();

  return {
    subject,
    html: baseEmailLayout(htmlContent, branding),
    text,
  };
}

// ── 4. Welcome Email ─────────────────────────────────────────────────────────

export function renderWelcomeEmail(params: {
  name: string;
  studioName: string;
  dashboardUrl: string;
}): { html: string; text: string; subject: string } {
  const { name, studioName, dashboardUrl } = params;
  const subject = `Welcome to DR Films Wedding Cinema Platform, ${name}! 🎬`;

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">Welcome, ${name}!</h2>
    <p style="font-size: 15px; color: #D4D4D8;">
      Congratulations on setting up <strong>${studioName}</strong> on the premier wedding video and photo delivery platform.
    </p>
    <p style="color: #A1A1AA;">
      Deliver luxury 4K streaming galleries to your couples, connect your Google Drive, enable client selections, and set up your custom domain.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardUrl}" class="btn" target="_blank">Go to Studio Dashboard</a>
    </div>
  `;

  const text = `Welcome ${name}!\n\nYour studio "${studioName}" is ready.\nOpen your dashboard: ${dashboardUrl}`;

  return {
    subject,
    html: baseEmailLayout(htmlContent, { studioName: "DR Films Wedding Cinema" }),
    text,
  };
}

// ── 5. Email Verification Email ──────────────────────────────────────────────

export function renderEmailVerificationEmail(params: {
  name: string;
  verifyUrl: string;
}): { html: string; text: string; subject: string } {
  const { name, verifyUrl } = params;
  const subject = `Verify your email address - DR Films SaaS`;

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">Verify Your Email Address</h2>
    <p style="font-size: 15px; color: #D4D4D8;">
      Hello ${name}, please click the button below to verify your email address and activate your studio account:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
    </div>

    <p style="font-size: 12px; color: #71717A;">
      This verification link is valid for 24 hours. If you did not create an account, you can safely ignore this email.
    </p>
  `;

  const text = `Hello ${name},\n\nPlease verify your email by opening:\n${verifyUrl}\n\nThis link is valid for 24 hours.`;

  return {
    subject,
    html: baseEmailLayout(htmlContent, { studioName: "DR Films Wedding Cinema" }),
    text,
  };
}

// ── 6. Password Reset Email ──────────────────────────────────────────────────


export function renderPasswordResetEmail(params: {
  name: string;
  resetUrl: string;
}): { html: string; text: string; subject: string } {
  const { name, resetUrl } = params;
  const subject = `Reset your DR Films account password`;

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">Password Reset Request</h2>
    <p style="font-size: 15px; color: #D4D4D8;">
      Hello ${name}, we received a request to reset the password for your photographer account.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Your Password</a>
    </div>

    <p style="font-size: 12px; color: #71717A;">
      For your security, this link is valid for 1 hour and can only be used once. If you did not request a password reset, your account is safe and no changes have been made.
    </p>
  `;

  const text = `Hello ${name},\n\nReset your password using this link:\n${resetUrl}\n\nThis link is single-use and valid for 1 hour.`;

  return {
    subject,
    html: baseEmailLayout(htmlContent, { studioName: "DR Films Wedding Cinema" }),
    text,
  };
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderTeamInviteEmail(props: {
  inviteeName: string;
  inviterStudioName: string;
  role: string;
  inviteUrl: string;
  branding?: EmailBrandingContext;
}): { html: string; text: string; subject: string } {
  const brand: EmailBrandingContext = {
    studioName: props.branding?.studioName || props.inviterStudioName || "DR Films Wedding Cinema",
    accentColor: props.branding?.accentColor || "#D4AF37",
    logoUrl: props.branding?.logoUrl,
    website: props.branding?.website,
  };
  const subject = `You've been invited to join ${props.inviterStudioName} on Wedding Vision Gallery`;
  const roleName = props.role.charAt(0).toUpperCase() + props.role.slice(1).toLowerCase();

  const content = `
    <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; font-family: 'Cinzel', serif;">
      Team Invitation
    </h2>
    <p style="color: #d1d5db; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
      Hello <strong style="color: #ffffff;">${escapeHtml(props.inviteeName)}</strong>,
    </p>
    <p style="color: #d1d5db; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong style="color: #ffffff;">${escapeHtml(props.inviterStudioName)}</strong> has invited you to collaborate on their wedding gallery workflows as a <strong style="color: ${brand.accentColor};">${escapeHtml(roleName)}</strong>.
    </p>
    <div style="background-color: #1a1a24; border: 1px solid #2a2a3c; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Your Role</p>
      <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">${escapeHtml(roleName)}</p>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
        You will be able to access your assigned galleries, review media, and coordinate seamlessly with the team.
      </p>
    </div>
    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="${escapeHtml(props.inviteUrl)}" 
         style="background: linear-gradient(135deg, ${brand.accentColor} 0%, #b89628 100%); color: #0a0a0f; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; letter-spacing: 0.02em; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25);">
        Accept Invitation & Set Password
      </a>
    </div>
    <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
      This invitation link will expire in 7 days. If you did not expect this email, you can safely ignore it.
    </p>
  `;

  return {
    html: baseEmailLayout(content, brand),
    text: `You've been invited to join ${props.inviterStudioName} as a ${roleName}.\n\nAccept your invitation and activate your account by visiting:\n${props.inviteUrl}\n\n(This invitation link expires in 7 days)`,
    subject,
  };
}

// ── 7. Gallery Expiring Soon Email ───────────────────────────────────────────

export function renderGalleryExpiringSoonEmail(params: {
  coupleName: string;
  daysRemaining: number;
  expiresAt?: string;
  galleryUrl: string;
  branding: EmailBrandingContext;
}): { html: string; text: string; subject: string } {
  const { coupleName, daysRemaining, expiresAt, galleryUrl, branding } = params;
  const studioName = branding.studioName || "Your Wedding Cinema";
  const daysText = daysRemaining === 1 ? "1 day" : `${daysRemaining} days`;
  const subject = `⏳ Reminder: Your Wedding Gallery expires in ${daysText} | ${coupleName}`;

  const formattedDate = expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">Hello ${coupleName},</h2>
    <p style="font-size: 16px; color: #D4D4D8;">
      This is a friendly reminder from <strong>${studioName}</strong> that your private online wedding gallery will conclude its active delivery period in <strong>${daysText}</strong>${formattedDate ? ` (on ${formattedDate})` : ""}.
    </p>
    <p style="color: #A1A1AA;">
      Please ensure you have enjoyed your photos, reviewed your videos, and finalized any selections before access concludes.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${galleryUrl}" class="btn" target="_blank">Access Your Wedding Gallery</a>
    </div>

    <p style="font-size: 13px; color: #71717A; margin-top: 24px;">
      If you need an extension or have questions, please reach out to ${studioName} directly.
    </p>
  `;

  return {
    html: baseEmailLayout(htmlContent, branding),
    text: `Hello ${coupleName},\n\nThis is a friendly reminder that your wedding gallery will expire in ${daysText}${formattedDate ? ` (on ${formattedDate})` : ""}.\n\nPlease access your gallery to view your media and complete any selections:\n${galleryUrl}\n\n— ${studioName}`,
    subject,
  };
}

// ── 8. Gallery Expired Notice Email ──────────────────────────────────────────

export function renderGalleryExpiredEmail(params: {
  coupleName: string;
  galleryUrl: string;
  branding: EmailBrandingContext;
}): { html: string; text: string; subject: string } {
  const { coupleName, galleryUrl, branding } = params;
  const studioName = branding.studioName || "Your Wedding Cinema";
  const subject = `Your Wedding Gallery access period has concluded | ${coupleName}`;

  const htmlContent = `
    <h2 style="color: #FFFFFF; font-size: 20px; margin-top: 0;">Hello ${coupleName},</h2>
    <p style="font-size: 16px; color: #D4D4D8;">
      The active online delivery period for your private wedding gallery with <strong>${studioName}</strong> has concluded.
    </p>
    <p style="color: #A1A1AA;">
      Your wedding memories remain safely archived. If you require extended access or wish to order additional prints or albums, please contact our studio.
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${galleryUrl}" class="btn" target="_blank">View Studio Contact Info</a>
    </div>
  `;

  return {
    html: baseEmailLayout(htmlContent, branding),
    text: `Hello ${coupleName},\n\nThe active delivery period for your wedding gallery with ${studioName} has concluded.\n\nYour media remains safely preserved. If you need renewed access, please contact us:\n${galleryUrl}\n\n— ${studioName}`,
    subject,
  };
}

export function renderEmailTemplate(
  templateId: string,
  data: {
    photographerName?: string;
    businessName?: string;
    clientName?: string;
    coupleTitle?: string;
    galleryUrl?: string;
    accessCode?: string;
    brandColor?: string;
    logoUrl?: string;
    selectionCount?: number;
    notes?: string;
    customMessage?: string;
    verifyUrl?: string;
    resetUrl?: string;
    inviteUrl?: string;
    dashboardUrl?: string;
    weddingDate?: string;
    role?: string;
    daysRemaining?: number;
    expiresAt?: string;
  }
): { html: string; text: string; subject: string } {
  const branding: EmailBrandingContext = {
    studioName: data.businessName || data.photographerName || "DR Films Wedding Cinema",
    logoUrl: data.logoUrl,
    accentColor: data.brandColor || "#D4AF37",
  };

  switch (templateId) {
    case "gallery_published":
      return renderGalleryPublishedEmail({
        coupleName: data.coupleTitle || data.clientName || "Valued Couple",
        weddingDate: data.weddingDate || "Your Special Day",
        galleryUrl: data.galleryUrl || "https://app.yourplatform.com",
        accessCode: data.accessCode,
        branding,
        customMessage: data.customMessage,
      });

    case "gallery_expiring_soon":
      return renderGalleryExpiringSoonEmail({
        coupleName: data.coupleTitle || data.clientName || "Valued Couple",
        daysRemaining: data.daysRemaining || 7,
        expiresAt: data.expiresAt,
        galleryUrl: data.galleryUrl || "https://app.yourplatform.com",
        branding,
      });

    case "gallery_expired":
      return renderGalleryExpiredEmail({
        coupleName: data.coupleTitle || data.clientName || "Valued Couple",
        galleryUrl: data.galleryUrl || "https://app.yourplatform.com",
        branding,
      });

    case "selection_submitted":
      return renderSelectionSubmittedPhotographerEmail({
        coupleName: data.coupleTitle || data.clientName || "Valued Couple",
        clientName: data.clientName,
        selectedCount: data.selectionCount || 0,
        submittedAt: new Date().toLocaleDateString(),
        dashboardUrl: data.dashboardUrl || data.galleryUrl || "https://app.yourplatform.com",
        branding,
        notes: data.notes,
      });


    case "selection_confirmation":
      return renderSelectionConfirmationClientEmail({
        coupleName: data.coupleTitle || data.clientName || "Valued Couple",
        selectedCount: data.selectionCount || 0,
        galleryUrl: data.galleryUrl || "https://app.yourplatform.com",
        branding,
      });

    case "welcome":
      return renderWelcomeEmail({
        name: data.clientName || data.photographerName || "Photographer",
        studioName: branding.studioName,
        dashboardUrl: data.dashboardUrl || "https://app.yourplatform.com/dashboard",
      });

    case "email_verification":
      return renderEmailVerificationEmail({
        name: data.clientName || "User",
        verifyUrl: data.verifyUrl || "https://app.yourplatform.com/verify-email",
      });

    case "password_reset":
      return renderPasswordResetEmail({
        name: data.clientName || "User",
        resetUrl: data.resetUrl || "https://app.yourplatform.com/reset-password",
      });

    case "team_invite":
      return renderTeamInviteEmail({
        inviteeName: data.clientName || "Team Member",
        inviterStudioName: branding.studioName,
        role: data.role || "MEMBER",
        inviteUrl: data.inviteUrl || "https://app.yourplatform.com/team/accept",
        branding,
      });

    default:
      throw new Error(`Unsupported email template ID: ${templateId}`);
  }
}

