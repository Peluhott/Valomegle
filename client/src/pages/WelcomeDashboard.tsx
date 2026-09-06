import { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function WelcomeDashboard() {
    const [showLogin, setShowLogin] = useState(false);

    const handleSwitchForm = () => setShowLogin(!showLogin);

    return (
        <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center px-4">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-neutral-900 tracking-tight">Valomegle</h1>
                <p className="mt-2 text-neutral-500 text-sm">Connect and chat with random players</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-neutral-200">
                <h2 className="text-lg font-semibold text-neutral-900 mb-6">
                    {showLogin ? 'Sign in' : 'Create an account'}
                </h2>
                {showLogin
                    ? <LoginForm handleSwitchForm={handleSwitchForm} />
                    : <RegisterForm handleSwitchForm={handleSwitchForm} />
                }
            </div>
        </div>
    );
}
