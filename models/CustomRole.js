import { Schema, model, models } from 'mongoose';

const memberSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
        },
        name: { type: String, trim: true, default: '' },
        addedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const customRoleSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        description: { type: String, trim: true, default: '' },
        members: [memberSchema],
    },
    { timestamps: true }
);

const CustomRole = models.CustomRole || model('CustomRole', customRoleSchema);
export default CustomRole;
