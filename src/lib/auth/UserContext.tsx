import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

/** Global context to provide the current Supabase user to all children. */
const UserContext = createContext<User | null>(null);

/** Hook to access the current user. Must be used inside a <UserContext.Provider>. */
export const useUser = (): User | null => useContext(UserContext);

export default UserContext;
