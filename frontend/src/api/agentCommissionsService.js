import client from './client';

export const agentCommissionsService = {
    getAll: (filters = {}) => {
        return client.get('/agent-commissions', { params: filters });
    },

    export: (filters = {}) => {
        return client.get('/agent-commissions/export', { params: filters, responseType: 'blob' });
    },

    markAsPaid: (id) => {
        return client.post(`/agent-commissions/pay/${id}`);
    },
};

export default agentCommissionsService;
