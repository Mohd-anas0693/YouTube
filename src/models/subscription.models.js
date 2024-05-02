import mongoose from 'mongoose';

const subscriptionScheam = new mongoose.Schema({
    subscribers: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {
        type: mongoose.Schema.Types.ObjecrtId,
        ref: "User"
    }
}, { timestamps: true });

const Subscription = mongoose.model("Subscription", subscriptionScheam);

export default Subscription;