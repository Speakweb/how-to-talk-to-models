# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container to /app
WORKDIR /app

# Copy the package.json file from your local host to the present location (.) in the container
COPY ./talk-to-models/package.json ./package.json
COPY ./talk-to-models/package-lock.json ./package-lock.json

# Install any needed packages specified in package.json
RUN npm install

# Make port 3000 available outside this container
EXPOSE 3000

COPY ./talk-to-models .

RUN npm run build;

# Run npm run start when the container launches
CMD ["npm", "run", "start"]
