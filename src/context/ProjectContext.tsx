import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { MaestrissProject } from '../types/project';
import { createDefaultProject } from '../utils/project';

type ProjectContextValue = {
  project: MaestrissProject;
  updateProject: (updater: (project: MaestrissProject) => MaestrissProject) => void;
  resetProject: () => void;
};

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

type ProjectProviderProps = {
  children: ReactNode;
};

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [project, setProject] = useState<MaestrissProject>(() => createDefaultProject());
  const updateProject = useCallback(
    (updater: (project: MaestrissProject) => MaestrissProject) => {
      setProject((currentProject) => {
        const nextProject = updater(currentProject);

        return {
          ...nextProject,
          metadata: {
            ...nextProject.metadata,
            modified: new Date().toISOString(),
          },
        };
      });
    },
    [],
  );
  const resetProject = useCallback(() => setProject(createDefaultProject()), []);

  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      updateProject,
      resetProject,
    }),
    [project, resetProject, updateProject],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }

  return context;
}
