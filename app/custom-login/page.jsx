'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Mail, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomMemberLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState('email'); // 'email' | 'otp'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOTP = async () => {
        if (!email.trim()) { toast.error('Enter your email'); return; }
        try {
            setLoading(true);
            const res = await fetch('/api/auth/custom-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success(data.message);
            setStep('otp');
        } catch (err) {
            toast.error(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp.trim()) { toast.error('Enter the OTP'); return; }
        try {
            setLoading(true);
            const res = await fetch('/api/auth/custom-member', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', email, otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success(`Welcome, ${data.name}!`);
            // Note: In a real app, you'd redirect to the member portal
            // router.push('/custom-portal'); 
            // For now, let's just show a success message as the portal might not exist yet
        } catch (err) {
            toast.error(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle>Member Portal Login</CardTitle>
                    <CardDescription>
                        {step === 'email'
                            ? 'Enter your registered email to receive an OTP.'
                            : `OTP sent to ${email}. Check your inbox.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {step === 'email' ? (
                        <>
                            <div className="space-y-1">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="pl-9"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                    />
                                </div>
                            </div>
                            <Button className="w-full" onClick={handleSendOTP} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Send OTP
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <Label htmlFor="otp">One-Time Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="otp"
                                        placeholder="6-digit OTP"
                                        className="pl-9 tracking-widest text-center text-lg font-mono"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                                    />
                                </div>
                            </div>
                            <Button className="w-full" onClick={handleVerifyOTP} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Verify & Login
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full text-sm"
                                onClick={() => { setStep('email'); setOtp(''); }}
                                disabled={loading}
                            >
                                ← Change Email
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
