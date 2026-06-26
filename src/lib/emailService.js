import { supabase } from './supabase';

export const sendEmail = async (to, subject, html) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html }
    });

    if (error) {
      throw new Error(error.message);
    }
    
    console.log('Email sent successfully via Edge Function:', data);
    return data;
  } catch (error) {
    console.error('Error sending email via Edge Function:', error);
    // Don't throw, just log so we don't break the app flow if emails fail
    return null;
  }
};

export const EmailTemplates = {
  consultantApplied: (name) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Gabriel Academics</h1>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="margin-top: 0; color: #111827;">Application Received! 📝</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Thank you for applying to be a consultant at Gabriel Academics! We have successfully received your application.</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Our administration team will review your qualifications shortly. We will notify you once your account has been verified.</p>
        <p style="color: #9ca3af; font-size: 14px;">If you have any questions, feel free to reply to this email.</p>
      </div>
    </div>
  `,

  consultantVerified: (name) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #f59e0b; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Gabriel Academics</h1>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="margin-top: 0; color: #111827;">Account Verified! 🎉</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hi ${name},</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Great news! The administration team at Gabriel Academics has verified your account. You can now log in and accept missions from the Mission Board.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/auth/consultant" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Mission Board</a>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">If you have any questions, feel free to reply to this email.</p>
      </div>
    </div>
  `,
  
  workSubmitted: (jobRef, consultantName) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Gabriel Academics - Command Centre</h1>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="margin-top: 0; color: #111827;">Work Submitted for QA</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Admin,</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Consultant <strong>${consultantName}</strong> has just submitted the final files for Job <strong>${jobRef}</strong>.</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Please log in to the Command Centre to review the work and perform Quality Assurance before delivering it to the client.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/auth/admin" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review in Command Centre</a>
        </div>
      </div>
    </div>
  `,

  workDelivered: (jobRef) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #10b981; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Gabriel Academics</h1>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="margin-top: 0; color: #111827;">Your Request is Complete! ✅</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hi there,</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">We are pleased to inform you that the work for your request <strong>${jobRef}</strong> has passed our Quality Assurance process and is ready for download.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/auth/client" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download Files</a>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">Don't forget to leave a review for your consultant!</p>
      </div>
    </div>
  `,

  qaFailed: (jobRef) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ef4444; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Gabriel Academics</h1>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <h2 style="margin-top: 0; color: #111827;">Revision Required</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Hi,</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">The administration team has reviewed your submission for Job <strong>${jobRef}</strong>, and it unfortunately did not pass Quality Assurance.</p>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">Please log in to the Consultant Portal to read the QA notes and submit your revisions as soon as possible.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/auth/consultant" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Feedback</a>
        </div>
      </div>
    </div>
  `
};
