const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const isStrongPassword = (password) => {
    // Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường, 1 số, và 1 ký tự đặc biệt
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

const isValidMongoid = (id) => {
    const mongoidRegex = /^[0-9a-fA-F]{24}$/;
    return mongoidRegex.test(id);
};

module.exports = {
    isValidEmail,
    isStrongPassword,
    isValidMongoid,
};