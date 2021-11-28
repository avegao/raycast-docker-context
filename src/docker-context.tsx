import { $ } from "zx";
import { useEffect, useState } from "react";
import {
  ActionPanel,
  environment,
  getApplications,
  Icon,
  List,
  render,
  showHUD,
  showToast,
  Toast,
  ToastStyle
} from "@raycast/api";

interface DockerContext {
  Current: boolean;
  Description: string;
  DockerEndpoint: string;
  Name: string;
  StackOrchestrator: string;
}

interface State {
  dockerExecutable?: string;
  contextList?: DockerContext[];
  codes?: Record<string, string>;
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});

  async function setContextList(): Promise<void> {
    try {
      const dockerExecutable = await getDockerExecutable();
      const contextList = await getContextList(dockerExecutable);

      setState({ contextList, dockerExecutable });
    } catch (e) {
      await catchError(e as Error);
    }
  }

  useEffect(() => {
    setContextList();
  }, []);

  return (
    <List isLoading={!state.contextList && !state.error}>
      {state.contextList?.map((context) =>
        <List.Item
          key={context.Name}
          title={context.Name}
          subtitle={context.Description}
          accessoryTitle={`${(context.Current) ? "Current" : ""}`}
          actions={<Actions context={context} dockerExecutable={state.dockerExecutable} />}
        />
      )}
    </List>
  );
}

function Actions(props: { context: DockerContext, dockerExecutable: string | undefined }) {
  const { context, dockerExecutable } = props;

  async function setDockerContext(context: DockerContext): Promise<void> {
    try {
      const command = await $`${dockerExecutable} context use ${context.Name}`;

      if (command.exitCode !== 0) {
        throw new Error(command.stderr);
      }

      const output = command.stdout;

      if (environment.isDevelopment) {
        console.log(`Docker context use output: ${output}`);
      }

      await showHUD(`Docker context changed to ${context.Name}`);

      render(<Command />);
    } catch (e) {
      await catchError(e as Error);
    }
  }

  return (
    <ActionPanel title={context.Name}>
      <ActionPanel.Item
        icon={{ source: Icon.Star }}
        title={`Use ${context.Name} as context`}
        onAction={() => setDockerContext(context)}
      />
    </ActionPanel>
  );
}

function catchError(err: Error): Promise<Toast> {
  return showToast(ToastStyle.Failure, "Something went wrong", err.message);
}

async function getDockerExecutable(): Promise<string> {
  const dockerApp = (await getApplications())
    .find((application) => application.name == "Docker");

  if (dockerApp === undefined) {
    throw new Error("Docker Desktop not installed");
  }

  return `${dockerApp.path}/Contents/Resources/bin/docker`;
}

async function getContextList(dockerExecutable: string): Promise<DockerContext[]> {
  const processOutput = await $`${dockerExecutable} context list --format=json`;
  const contextList = JSON.parse(processOutput.stdout);

  if (environment.isDevelopment) {
    console.log(`Docker context list output: ${processOutput.stdout}`);
  }

  return contextList;
}
