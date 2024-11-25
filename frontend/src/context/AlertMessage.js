import { createContext, useState } from "react";

export const AlertContext = createContext();

export const AlertProvider = ({children}) =>{
    const [alertMessage, setAlertMessage] = useState ("");
    const [alertType, setAlertType] = useState ("");

    const showAlert = (message, type) => {
        setAlertMessage(message);
        setAlertType(type);

        setTimeout(() => {
            setAlertMessage("");
        }, 3000);
    }
    return(
        <AlertContext.Provider value={{alertMessage, alertType, showAlert}}>
            {children}
        </AlertContext.Provider>
    )
}