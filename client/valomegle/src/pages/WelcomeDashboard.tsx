import { useState } from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

export default function WelcomeDashboard() {
    const [showLogin, setShowLogin] = useState(false);

    const handleSwitchForm = () => setShowLogin(!showLogin);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-white tracking-tight">Valomegle</h1>
                <p className="mt-2 text-slate-400 text-sm">Connect and chat with random players</p>
            </div>

            <div className="bg-slate-800 rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-700">
                <h2 className="text-lg font-semibold text-white mb-6">
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
