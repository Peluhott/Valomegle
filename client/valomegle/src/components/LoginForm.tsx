import React, {useState} from 'react';
import axios from 'axios';

type LoginFormProps = {
handleSwitchForm: () => void;
}

export default function LoginForm({ handleSwitchForm }: LoginFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        // send login request to server
        try {
            const response = await axios.post('http://localhost:8080/api/users/login', { username, password });
            localStorage.setItem('token', response.data.token);
            console.log('Login successful');
        } catch (error) {
            console.error(error);
        }
        //save token
    }

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor="username">Username:</label>
            <input type="text" id="username" placeholder='username' value={username} onChange={(e) => setUsername(e.target.value)} />
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" placeholder='password' value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="submit" >Login</button>
            <button type="button" onClick={handleSwitchForm}>Switch to Register</button>
        </form>
    )
}