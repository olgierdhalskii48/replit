import { authAPI } from './auth';

export interface Payment {
  id: number;
  case_id?: number;
  amount: number;
  currency: string;
  payment_type: 'analysis' | 'legal_document' | 'package';
  description?: string;
  provider: 'PAYU' | 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER';
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_url?: string;
  external_payment_id?: string;
  created_at: string;
  paid_at?: string;
}

export interface PaymentCreate {
  case_id: number;
  amount: number;
  payment_type?: 'analysis' | 'legal_document' | 'package';
  provider?: 'PAYU' | 'STRIPE' | 'PAYPAL' | 'BANK_TRANSFER';
  description?: string;
  promo_code?: string;
}

export interface PaymentResponse {
  payment?: Payment;
  error?: string;
}

export interface PaymentsResponse {
  payments?: Payment[];
  error?: string;
}

export const paymentsApi = {
  /**
   * Create a new payment for a case
   */
  async createPayment(paymentData: PaymentCreate): Promise<PaymentResponse> {
    try {
      const payment = await authAPI.makeRequest<Payment>('POST', '/payments/', paymentData, true);
      return { payment };
    } catch (error) {
      console.error('Create payment error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  /**
   * Get all payments for current user
   */
  async getUserPayments(): Promise<PaymentsResponse> {
    try {
      const payments = await authAPI.makeRequest<Payment[]>('GET', '/payments/', undefined, true);
      return { payments };
    } catch (error) {
      console.error('Get payments error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  /**
   * Get specific payment details
   */
  async getPayment(paymentId: number): Promise<PaymentResponse> {
    try {
      const payment = await authAPI.makeRequest<Payment>('GET', `/payments/${paymentId}/`, undefined, true);
      return { payment };
    } catch (error) {
      console.error('Get payment error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  /**
   * Update payment status (for webhook integration)
   */
  async updatePaymentStatus(
    paymentId: number, 
    status: Payment['status'], 
    externalPaymentId?: string, 
    paymentUrl?: string
  ): Promise<PaymentResponse> {
    try {
      const updateData: any = { status };
      if (externalPaymentId) updateData.external_payment_id = externalPaymentId;
      if (paymentUrl) updateData.payment_url = paymentUrl;
      const payment = await authAPI.makeRequest<Payment>(
        'PATCH', 
        `/payments/${paymentId}/status`, 
        updateData, 
        true
      );
      return { payment };
    } catch (error) {
      console.error('Update payment status error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  /**
   * Simulate successful payment (for development/testing)
   */
  async simulatePaymentSuccess(paymentId: number): Promise<PaymentResponse> {
    try {
      const result = await authAPI.makeRequest<{ payment: Payment }>(
        'POST', 
        `/payments/simulate-success/${paymentId}`, 
        {}, 
        true
      );
      return { payment: result.payment };
    } catch (error) {
      console.error('Simulate payment success error:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
};