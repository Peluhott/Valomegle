import {useState} from 'react';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import Nav from '../components/Nav';




export default function WelcomeDashboard() {
    const [switchForm, setSwitchForm] = useState(false);

    const handleSwitchForm = () => {
        setSwitchForm(!switchForm);
    }

    return (
        <div>
            <Nav/>
            {switchForm ? <LoginForm handleSwitchForm={handleSwitchForm}/> : <RegisterForm handleSwitchForm={handleSwitchForm}/>}
        </div>
    )

}