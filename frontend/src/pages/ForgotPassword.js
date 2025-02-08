import { useContext, useState } from "react"
import { AlertContext } from "../context/AlertMessage"
import axios from "axios";

const ForgotPassword = () => {
	const { showAlert } = useContext(AlertContext);
	const [email, setEmail] = useState('');


	const handleSubmit = async (e) => {
		e.preventDefault();

		try {
			const response = await axios.post('http://localhost:5000/api/users/forgot-password', { email });
			if (response.data.success) {
				showAlert("Password reset link sent to your email", "success");
			}
		} catch (error) {
			showAlert(error.response?.data?.message || "Something went wrong", "error");
		}
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-[#D3A29D] to-[#9EABA2]">
			<div className="w-full max-w-md mx-auto shadow-2xl rounded-lg bg-white p-6">
				<h1 className="text-3xl font-bold mb-4 text-center">Forgot Password</h1>
				<form onSubmit={handleSubmit}>
					<div className="flex flex-col space-y-3 my-3">
						<label className="text-xl font-semibold">Email</label>
						<input
							type="email"
							placeholder="Enter your email"
							className="border pl-7 py-2 rounded-lg w-full"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<button className="py-2 bg-slate-950 text-white w-full rounded-xl font-semibold text-lg">
						Reset Password
					</button>
				</form>
			</div>
		</div>
	);
}

export default ForgotPassword;
