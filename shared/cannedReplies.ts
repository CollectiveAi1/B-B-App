/**
 * House answers to the questions guests ask most.
 *
 * The server quotes these in the model's instructions and the demo responder
 * returns them directly, so a guest gets the same wording either way.
 */
export const CANNED_REPLY = {
  checkIn:
    'Check-in is usually after 3 PM. The lockbox code will be sent on the day of arrival. Please let us know if you have any questions.',
  wifi: 'You can find the Wi-Fi network name and password on the welcome card on the kitchen counter.',
  coffeeMaker: 'Yes, there is a coffee maker available for your use.',
  iron: 'Yes, you can find an iron and an ironing board in the laundry closet for your convenience.',
  hairdryer: 'Yes, a hairdryer is located in the bathroom vanity.',
  cancellation:
    "I understand you're asking about canceling your reservation. To proceed with the cancellation and to see how the refund policy applies to your booking, please go to your Trips page on the Airbnb app or website.",
  stayChange:
    "I understand you're asking about early check-in or late check-out. These requests are subject to availability and need to be approved by the host directly. Please send a direct message to the host to inquire about this possibility.",
} as const;
