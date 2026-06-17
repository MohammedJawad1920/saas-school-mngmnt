const mongoose = require('mongoose');
(async () => {
    const uri = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';
    try {
        await mongoose.connect(uri);
        const Finance = mongoose.models.Finance || mongoose.model('Finance', new mongoose.Schema({ 
            accountName: String, 
            accountType: String, 
            userId: String 
        }, { collection: 'finances' }));
        
        const counts = await Finance.countDocuments({ userId: { $in: ['TCH-002', 'TCH-003', 'tch-002', 'tch-003'] } });
        console.log('Count for TCH-002/003:', counts);
        
        const total = await Finance.countDocuments({});
        console.log('Total records:', total);
        
        const samples = await Finance.find({ userId: { $exists: true } }).limit(5);
        console.log('Samples with userId:', JSON.stringify(samples));
        
        const samplesNoUserId = await Finance.find({ userId: { $exists: false } }).limit(5);
        console.log('Samples without userId:', JSON.stringify(samplesNoUserId));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
