import React, { useReducer, useEffect } from 'react';
import { createContext } from 'react';
import { useToast } from 'react-hot-toast';
import { useSupabase } from '@supabase/auth-helpers-react';
import { useApi } from '../hooks/useApi';

const AppContext = createContext();

const initialState = {
  // ... existing initial state properties
};

const reducer = (state, action) => {
  // ... existing reducer logic
};

const AppContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toast = useToast();
  const supabase = useSupabase();
  const api = useApi();

  const createCurriculum = async (formData: any): Promise<string | null> => {
    // ...
    const response = await api.post('/api/curricula/', formData);
    if (response.data.curriculum_id) {
      dispatch({ type: 'GENERATION_START', payload: { curriculumId: response.data.curriculum_id } });
      pollGenerationStatus(response.data.curriculum_id);
      return response.data.curriculum_id;
    }
    return null;
  };

  const pollGenerationStatus = (curriculumId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return clearInterval(interval);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/curricula/${curriculumId}/status`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!response.ok) return clearInterval(interval);

        const curriculum = await response.json();
        
        if (curriculum.generation_status === 'completed' || curriculum.generation_status === 'failed') {
          clearInterval(interval);
          dispatch({ type: 'GENERATION_COMPLETE', payload: { curriculumId } });
          toast.success(`Curriculum "${curriculum.title}" finished generating!`);
          fetchData(); // Refetch all data
        } else {
          dispatch({ type: 'GENERATION_PROGRESS', payload: { curriculumId, progress: curriculum.generation_progress } });
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 3000);
  };

  useEffect(() => {
    // ... existing useEffect logic
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
export { AppContextProvider }; 