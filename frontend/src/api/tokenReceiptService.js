import client from './client';

export const tokenReceiptService = {
    getAll: (showroomId) => {
        const params = showroomId ? { showroomId } : {};
        return client.get('/token-receipts', { params });
    },

    getById: (id) => client.get(`/token-receipts/${id}`),

    create: (data) => client.post('/token-receipts', data),

    update: (id, data) => client.put(`/token-receipts/${id}`, data),

    delete: (id) => client.delete(`/token-receipts/${id}`),

    getDownloadUrl: (id) => `${client.defaults.baseURL}/pdf/token-receipt/${id}`,
};

export default tokenReceiptService;
