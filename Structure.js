/ (Your Project Root)
├── .github/workflows/build.yml  <-- GitHub Actions (CI/CD)
├── .gitignore                   <-- Prevents junk files
├── build.gradle.kts             <-- Root build script
├── settings.gradle.kts          <-- Project structure map
├── gradlew                      <-- Executable (Needs +x permission)
├── gradle/wrapper/              <-- Gradle wrapper files
└── app/
    ├── build.gradle.kts         <-- App-level dependencies
    └── src/main/
        ├── AndroidManifest.xml  <-- App identity
        ├── java/com/vicious/code/ <-- YOUR SOURCE CODE HERE
        └── res/                 <-- Assets (layout, drawable, etc.)
