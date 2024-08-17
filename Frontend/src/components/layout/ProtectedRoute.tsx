import { useEffect, useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // const { instance, accounts } = useMsal();
  const [isValidToken, setIsValidToken] = useState(true);

  // useEffect(() => {
  //   const checkTokenValidity = async () => {
  //     if (accounts.length > 0) {
  //       try {
  //         console.log('Checking token validity');
  //         await instance.acquireTokenSilent({
  //           scopes: loginRequest.scopes,
  //           account: accounts[0],
  //         });
  //         console.log('Token is valid');
  //         setIsValidToken(true);
  //       } catch (error) {
  //         if (error instanceof InteractionRequiredAuthError) {
            // Token is expired or invalid, redirect to login
  //           console.log('Token is expired or invalid');
  //           instance.acquireTokenRedirect(loginRequest);
  //         }
  //       }
  //     }
  //   };

    // checkTokenValidity();
  // }, [instance, accounts]);

  if (!isValidToken) {
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
