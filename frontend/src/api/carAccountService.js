import client from './client';

export const carAccountService = {
    getAll: (filters = {}) => {
        return client.get('/car-accounts', { params: filters });
    },

    getById: (id) => client.get(`/car-accounts/${id}`),

    create: (data) => client.post('/car-accounts', data),

    update: (id, data) => client.put(`/car-accounts/${id}`, data),

    delete: (id) => client.delete(`/car-accounts/${id}`),

    export: (filters = {}) => {
        return client.get('/car-accounts/export', { params: filters, responseType: 'blob' });
    },
};

export default carAccountService;
