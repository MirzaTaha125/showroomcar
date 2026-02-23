import client from './client';

export const tokenReceiptService = {
    getAll: (filters = {}) => {
        return client.get('/token-receipts', { params: filters });
    },

    getById: (id) => client.get(`/token-receipts/${id}`),

    create: (data) => client.post('/token-receipts', data),

    update: (id, data) => client.put(`/token-receipts/${id}`, data),

    delete: (id) => client.delete(`/token-receipts/${id}`),

    export: (filters = {}) => {
        return client.get('/token-receipts/export', { params: filters, responseType: 'blob' });
    },

    getDownloadUrl: (id) => `${client.defaults.baseURL}/pdf/token-receipt/${id}`,
};

export default tokenReceiptService;
