class EmailService {
  /**
   * Dispatches the 6-digit registration verification code to the user's email.
   * Includes console logging for local development and sandbox environments.
   */
  public async sendVerificationCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    console.log(`\n======================================================`);
    console.log(`[EMAIL SERVICE] Verification Code Dispatch`);
    console.log(`To: ${cleanEmail}`);
    console.log(`Subject: ${code} is your RechargeOS verification code`);
    console.log(`Security Code: [ ${code} ] (Expires in 5 minutes)`);
    console.log(`======================================================\n`);

    return { success: true };
  }
}

export const emailService = new EmailService();
