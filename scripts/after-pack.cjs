const fs = require("node:fs/promises");
const path = require("node:path");
module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;
  const { NtExecutable, NtExecutableResource } = require("pe-library");
  const ResEdit = require("resedit");
  const executable = path.resolve(context.appOutDir, "Booklean.exe");
  if (path.dirname(executable) !== path.resolve(context.appOutDir))
    throw new Error("Unexpected executable path");
  const exe = NtExecutable.from(await fs.readFile(executable), {
    ignoreCert: true,
  });
  const resources = NtExecutableResource.from(exe);
  const ico = ResEdit.Data.IconFile.from(
    await fs.readFile(path.join(__dirname, "../build/icon.ico")),
  );
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries);
  for (const group of groups)
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
      resources.entries,
      group.id,
      group.lang,
      ico.icons.map((i) => i.data),
    );
  for (const version of ResEdit.Resource.VersionInfo.fromEntries(
    resources.entries,
  )) {
    const [major, minor, patch] = context.packager.appInfo.version.split('.').map(Number);
    version.setFileVersion(major, minor, patch, 0, 1033);
    version.setProductVersion(major, minor, patch, 0, 1033);
    version.setStringValues(
      { lang: 1033, codepage: 1200 },
      {
        FileDescription: "Booklean",
        ProductName: "Booklean",
        CompanyName: "Booklean",
        OriginalFilename: "Booklean.exe",
        InternalName: "Booklean",
        LegalCopyright: "Booklean",
      },
    );
    version.outputToResourceEntries(resources.entries);
  }
  resources.outputResource(exe);
  await fs.writeFile(executable, Buffer.from(exe.generate()));
};
