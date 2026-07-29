import mongoose from 'mongoose';

const agentCommissionSchema = new mongoose.Schema(
    {
        showroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Showroom', required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        carAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'CarAccount', required: true },
        amount: { type: Number, required: true },
        baseAmount: { type: Number, required: true },
        percentage: { type: Number, default: 0.5 },
        status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
        date: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

agentCommissionSchema.index({ showroom: 1, date: -1 });
agentCommissionSchema.index({ user: 1, date: -1 });
agentCommissionSchema.index({ carAccount: 1 }, { unique: true });

export default mongoose.model('AgentCommission', agentCommissionSchema);
