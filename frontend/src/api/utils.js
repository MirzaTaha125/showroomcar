export const formatCnic = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 13);
    let res = '';
    if (digits.length > 5) {
        res += digits.slice(0, 5) + '-';
        if (digits.length > 12) {
            res += digits.slice(5, 12) + '-' + digits.slice(12);
        } else {
            res += digits.slice(5);
        }
    } else {
        res = digits;
    }
    return res;
};

export const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    if (!num || isNaN(num)) return '';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convert = (n) => {
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    };

    const result = convert(Math.floor(num));
    return result.trim() + ' Only';
};

export const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    let res = '';
    if (digits.length > 4) {
        res = digits.slice(0, 4) + '-' + digits.slice(4);
    } else {
        res = digits;
    }
    return res;
};
export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export const getLogoUrl = (logoPath, apiBaseURL = '') => {
    if (!logoPath) return null;
    if (logoPath.startsWith('http')) return logoPath;

    // Normalize base URL: remove trailing /api or /
    let base = (apiBaseURL || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');

    // Ensure path starts with /
    const path = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;

    // If path already starts with /api, just append to base
    if (path.startsWith('/api')) {
        return `${base}${path}`;
    }

    // Otherwise append /api/path
    return `${base}/api${path}`;
};

