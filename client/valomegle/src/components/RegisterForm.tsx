import React, {useState} from 'react';
import axios from 'axios';

type RegisterFormProps = {
handleSwitchForm: () => void;
}

export default function RegisterForm({ handleSwitchForm }: RegisterFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        // send register request to server
         try {
                    const response = await axios.post('http://localhost:8080/api/users/register', { username, email, password });
                    return console.log(response.data);
                } catch (error) {
                    console.error(error);
                }
        //save token
    }

    return (
        <form onSubmit={handleSubmit}>
            <label htmlFor="username">Username:</label>
            <input type="text" id="username" placeholder='username' value={username} onChange={(e) => setUsername(e.target.value)} />

            <label htmlFor="email">Email:</label>
            <input type="email" id="email" placeholder='email' value={email} onChange={(e) => setEmail(e.target.value)} />
            
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" placeholder='password' value={password} onChange={(e) => setPassword(e.target.value)} />
            
            <button type="submit">Register</button>
            <button type="button" onClick={handleSwitchForm}>Switch to Login</button>
        </form>
    )
}