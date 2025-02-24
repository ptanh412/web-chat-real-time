import { useContext, useState } from "react"
import { AlertContext } from "../context/AlertMessage"
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

const ResetPassword = () =>{
	const {showAlert} = useContext(AlertContext);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token');
	const navigate = useNavigate();

	const handleSubmit = async(e) =>{
		e.preventDefault();

		if (password !== confirmPassword){
			showAlert("Passwords do not match", "error");
			return;
		}

		try {
			const response = await axios.post("http://localhost:5000/api/users/reset-password", {
				token,
				newPassword: password
			});

			if (response.data.success){
				showAlert("Password reset successful", "success");
				navigate('/');
			}
		} catch (error) {
			showAlert(error.response?.data?.message || "Error reset password", "error");
		}
	}
	return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-[#D3A29D] to-[#9EABA2]">
            <div className="w-full max-w-md mx-auto shadow-2xl rounded-lg bg-white p-6 ronde">
                <h1 className="text-3xl font-bold mb-4 text-center text-black">Reset Password</h1>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col space-y-3 my-3">
                        <label className="text-xl font-semibold text-black">New Password</label>
                        <input
                            type="password"
                            placeholder="Enter new password"
                            className="border pl-7 py-2 rounded-lg w-full text-black"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex flex-col space-y-3 my-3">
                        <label className="text-xl font-semibold text-black">Confirm Password</label>
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            className="border pl-7 py-2 rounded-lg w-full text-black"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button className="py-2 bg-slate-950 text-white w-full rounded-xl font-semibold text-lg">
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;