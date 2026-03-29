import os
from smolagents import LiteLLMModel, CodeAgent

# --- Agent Tools ---

def save_code(filename: str, code: str) -> str:
    """
    Saves the provided code to a file within the project.

    :param filename: The relative path of the file to save.
    :param code: The code content to write to the file.
    :return: A message indicating the result of the operation.
    """
    try:
        # Security: Ensure the path is safe and within the project
        project_dir = os.getcwd()
        safe_path = os.path.abspath(os.path.join(project_dir, filename))
        
        # Basic security check to prevent writing outside project
        if not safe_path.startswith(project_dir):
            return f"Error: Cannot write outside project directory {project_dir}"
            
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(code)
        return f"Code successfully saved to {filename}"
    except Exception as e:
        return f"Error saving code: {e}"

def read_file(filename: str) -> str:
    """
    Reads the content of a file.

    :param filename: The relative path of the file to read.
    :return: The content of the file or an error message.
    """
    try:
        safe_path = os.path.join(os.getcwd(), filename)
        if not os.path.exists(safe_path):
            return f"Error: File {filename} does not exist."
        with open(safe_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}"

def list_files(directory: str = ".") -> str:
    """
    Lists files in the specified directory (recursive, ignoring hidden/venv).

    :param directory: The directory to list. Defaults to current directory.
    :return: A string listing relative file paths.
    """
    file_list = []
    try:
        for root, dirs, files in os.walk(directory):
            # Ignore hidden directories, venv, and git
            dirs[:] = [d for d in dirs if not d.startswith('.') and 'venv' not in d and '__pycache__' not in d]
            
            for file in files:
                if file.startswith('.') or file.endswith('.pyc'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, directory)
                file_list.append(rel_path)
        return "\n".join(file_list)
    except Exception as e:
        return f"Error listing files: {e}"

# 1. Initialize the model
model = LiteLLMModel(
    model_id="ollama_chat/qwen2:1.5b", # Ensure you have this model pulled in Ollama
    api_base="http://127.0.0.1:11434",
    num_ctx=8192
)

# 2. Setup the agent with all tools
agent = CodeAgent(tools=[save_code, read_file, list_files], model=model)

# 3. Define the Task
# We ask the agent to explore the project and write a targeted test for the services module.
prompt = """
I need to improve the test coverage for this project.
1. List the files to understand the project structure.
2. Read 'backend/services.py' to understand the `simulate_drift_metrics` logic.
3. Create a new test file 'backend/tests_drift.py' that properly tests this function using `unittest`.
"""

print("Agent is running...")
response = agent.run(prompt)
print(response)