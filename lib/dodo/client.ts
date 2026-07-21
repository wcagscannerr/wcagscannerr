import DodoPayments from 'dodopayments'

let _dodo: DodoPayments | null = null

export function getDodo(): DodoPayments {
  if (!_dodo) {
    const baseURL = process.env.DODO_PAYMENTS_ENVIRONMENT === 'live_mode'
      ? 'https://live.dodopayments.com'
      : 'https://test.dodopayments.com'

    _dodo = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
      baseURL,
    })
  }
  return _dodo
}