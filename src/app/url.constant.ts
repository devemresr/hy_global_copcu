const phoneNumber = ''; //<countrycode><num>
const message = '';
const encodedMessage = encodeURIComponent(message);
export const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

export const mailUrl = 'mailto:support@.com';
